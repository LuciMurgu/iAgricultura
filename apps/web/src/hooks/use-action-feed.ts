"use client";

/**
 * Hook: useActionFeed — fetches dashboard action feed from mock or real API.
 * Uses the feature gate pattern from MOCK_STRATEGY.md.
 */
import { useQuery } from "@tanstack/react-query";
import { isFeatureReal } from "@/lib/mock/feature-gates";
import { mockActionFeed } from "@/lib/mock/data/action-feed";
import { ActionFeedItemSchema } from "@/types/dashboard";
import type { ActionFeedItem } from "@/types/dashboard";
import { z } from "zod";

// TODO: import { dashboardService } from "@/lib/api/services/dashboard";

const ActionFeedListSchema = z.array(ActionFeedItemSchema);

export function useActionFeed() {
  const gate = isFeatureReal("actionFeed");

  return useQuery<ActionFeedItem[]>({
    queryKey: ["action-feed"],
    queryFn: async () => {
      if (gate) {
        // TODO: const raw = await dashboardService.getActionFeed();
        // return ActionFeedListSchema.parse(raw);
        return ActionFeedListSchema.parse(mockActionFeed.list());
      }
      return ActionFeedListSchema.parse(mockActionFeed.list());
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
