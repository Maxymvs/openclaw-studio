import { buildAgentMainSessionKey, isSameSessionKey } from "@/lib/gateway/GatewayClient";
import { type GatewayModelPolicySnapshot } from "@/lib/gateway/models";
import { type StudioSettings } from "@/lib/studio/settings";
import {
  type SummaryPreviewSnapshot,
  type SummarySnapshotPatch,
  type SummaryStatusSnapshot,
} from "@/features/agents/state/runtimeEventBridge";
import type { AgentStoreSeed } from "@/features/agents/state/store";
import { deriveHydrateAgentFleetResult } from "@/features/agents/operations/agentFleetHydrationDerivation";

type GatewayClientLike = {
  call: (method: string, params: unknown) => Promise<unknown>;
};

type AgentsListResult = {
  defaultId: string;
  mainKey: string;
  scope?: string;
  agents: Array<{
    id: string;
    name?: string;
    identity?: {
      name?: string;
      theme?: string;
      emoji?: string;
      avatar?: string;
      avatarUrl?: string;
    };
  }>;
};

type SessionsListEntry = {
  key: string;
  updatedAt?: number | null;
  displayName?: string;
  origin?: { label?: string | null; provider?: string | null } | null;
  thinkingLevel?: string;
  modelProvider?: string;
  model?: string;
  execHost?: string | null;
  execSecurity?: string | null;
  execAsk?: string | null;
};

type SessionsListResult = {
  sessions?: SessionsListEntry[];
};

type ExecApprovalsSnapshot = {
  file?: {
    agents?: Record<string, { security?: string | null; ask?: string | null }>;
  };
};

export type HydrateAgentFleetResult = {
  seeds: AgentStoreSeed[];
  sessionCreatedAgentIds: string[];
  sessionSettingsSyncedAgentIds: string[];
  summaryPatches: SummarySnapshotPatch[];
  suggestedSelectedAgentId: string | null;
  configSnapshot: GatewayModelPolicySnapshot | null;
};

export async function hydrateAgentFleetFromGateway(params: {
  client: GatewayClientLike;
  gatewayUrl: string;
  cachedConfigSnapshot: GatewayModelPolicySnapshot | null;
  loadStudioSettings: () => Promise<StudioSettings | null>;
  isDisconnectLikeError: (err: unknown) => boolean;
  logError?: (message: string, error: unknown) => void;
}): Promise<HydrateAgentFleetResult> {
  const logError = params.logError ?? ((message, error) => console.error(message, error));

  const gatewayKey = params.gatewayUrl.trim();

  // Parallelize three independent calls: config.get, loadStudioSettings, agents.list
  const [configResult, settingsResult, agentsResult] = await Promise.all([
    params.cachedConfigSnapshot
      ? Promise.resolve(params.cachedConfigSnapshot)
      : params.client
          .call("config.get", {})
          .then((result) => result as GatewayModelPolicySnapshot)
          .catch((err: unknown) => {
            if (!params.isDisconnectLikeError(err)) {
              logError("Failed to load gateway config while loading agents.", err);
            }
            return null;
          }),
    gatewayKey
      ? params.loadStudioSettings().catch((err: unknown) => {
          logError("Failed to load studio settings while loading agents.", err);
          return null;
        })
      : Promise.resolve(null),
    params.client.call("agents.list", {}) as Promise<AgentsListResult>,
  ]);

  const configSnapshot: GatewayModelPolicySnapshot | null = configResult;
  const settings: StudioSettings | null = settingsResult;
  const mainKey = agentsResult.mainKey?.trim() || "main";

  const mainSessionKeyByAgent = new Map<string, SessionsListEntry | null>();
  await Promise.all(
    agentsResult.agents.map(async (agent) => {
      try {
        const expectedMainKey = buildAgentMainSessionKey(agent.id, mainKey);
        const sessions = (await params.client.call("sessions.list", {
          agentId: agent.id,
          includeGlobal: false,
          includeUnknown: false,
          search: expectedMainKey,
          limit: 4,
        })) as SessionsListResult;
        const entries = Array.isArray(sessions.sessions) ? sessions.sessions : [];
        const mainEntry =
          entries.find((entry) => isSameSessionKey(entry.key ?? "", expectedMainKey)) ?? null;
        mainSessionKeyByAgent.set(agent.id, mainEntry);
      } catch (err) {
        if (!params.isDisconnectLikeError(err)) {
          logError("Failed to list sessions while resolving agent session.", err);
        }
        mainSessionKeyByAgent.set(agent.id, null);
      }
    })
  );

  let statusSummary: SummaryStatusSnapshot | null = null;
  let previewResult: SummaryPreviewSnapshot | null = null;
  try {
    const sessionKeys = Array.from(
      new Set(
        agentsResult.agents
          .filter((agent) => Boolean(mainSessionKeyByAgent.get(agent.id)))
          .map((agent) => buildAgentMainSessionKey(agent.id, mainKey))
          .filter((key) => key.trim().length > 0)
      )
    ).slice(0, 64);
    if (sessionKeys.length > 0) {
      const snapshot = await Promise.all([
        params.client.call("status", {}) as Promise<SummaryStatusSnapshot>,
        params.client.call("sessions.preview", {
          keys: sessionKeys,
          limit: 8,
          maxChars: 240,
        }) as Promise<SummaryPreviewSnapshot>,
      ]);
      statusSummary = snapshot[0] ?? null;
      previewResult = snapshot[1] ?? null;
    }
  } catch (err) {
    if (!params.isDisconnectLikeError(err)) {
      logError("Failed to load initial summary snapshot.", err);
    }
  }

  const derived = deriveHydrateAgentFleetResult({
    gatewayUrl: params.gatewayUrl,
    configSnapshot: configSnapshot ?? null,
    settings,
    execApprovalsSnapshot,
    agentsResult,
    mainSessionByAgentId: mainSessionKeyByAgent,
    statusSummary,
    previewResult,
  });

  return derived;
}
