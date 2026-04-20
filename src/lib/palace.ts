import { ALL_TOPICS, type Topic } from "./topics";

/**
 * MemPalace Architecture:
 * - Wings: Major domains (Categories like "Medieval Philosophy", "Logic")
 * - Rooms: Sub-domains or clusters (Tags like "scholasticism", "ethics")
 * - Drawers: The actual content (The Topic itself)
 */

export interface Drawer {
  id: string;
  name: string;
  topic: Topic;
}

export interface Room {
  id: string;
  name: string;
  drawers: Drawer[];
}

export interface Wing {
  id: string;
  name: string;
  rooms: Room[];
}

export interface Palace {
  wings: Wing[];
}

export function buildPalace(): Palace {
  const wingsMap = new Map<string, Wing>();

  for (const topic of ALL_TOPICS) {
    const wingId = topic.category || "General Philosophy";
    
    if (!wingsMap.has(wingId)) {
      wingsMap.set(wingId, {
        id: wingId,
        name: wingId,
        rooms: [],
      });
    }

    const wing = wingsMap.get(wingId)!;
    
    // For now, we'll use the first tag as a "Room", or "General" if no tags
    const roomId = topic.tags?.[0] || "General";
    let room = wing.rooms.find(r => r.id === roomId);

    if (!room) {
      room = {
        id: roomId,
        name: roomId.charAt(0).toUpperCase() + roomId.slice(1),
        drawers: [],
      };
      wing.rooms.push(room);
    }

    room.drawers.push({
      id: topic.id,
      name: topic.name,
      topic: topic,
    });
  }

  return {
    wings: Array.from(wingsMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export const WING_COLORS: Record<string, string> = {
  "Ancient Philosophy": "#2DD4BF",
  "Medieval Philosophy": "#F59E0B",
  "Modern Philosophy": "#EC4899",
  "Logic": "#8B5CF6",
  "Core Philosophy": "#3B82F6",
  "Applied Philosophy": "#10B981",
  "General Philosophy": "#6B7280",
};

export function getTopicColor(topic: Topic): string {
  if (topic.color) return topic.color;
  return WING_COLORS[topic.category] || WING_COLORS["General Philosophy"];
}

/**
 * Mining Logic: Automatically discover relationships between topics
 * by searching for topic names within the body content of other topics.
 */
export function mineRelationships(allTopics: Topic[], allContent: { slug: string, body: string }[]) {
  const suggestions: { source: string, target: string }[] = [];

  for (const topic of allTopics) {
    const content = allContent.find(c => c.slug === topic.slug);
    if (!content) continue;

    for (const other of allTopics) {
      if (topic.id === other.id) continue;
      
      // Look for the other topic's name in the current topic's body
      const nameRegex = new RegExp(`\\b${other.name}\\b`, 'gi');
      if (nameRegex.test(content.body)) {
        // If not already in relatedTopics, suggest it
        if (!topic.relatedNodes.some(rn => rn.id === other.id)) {
          suggestions.push({ source: topic.id, target: other.id });
        }
      }
    }
  }

  return suggestions;
}

/**
 * Two-pass retrieval as per MemPalace proposal:
 * 1. Classify/Filter by Wing
 * 2. Search within the structure
 */
export function searchPalace(query: string, palace: Palace) {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const results: { wing: string; room: string; drawer: Drawer }[] = [];

  for (const wing of palace.wings) {
    for (const room of wing.rooms) {
      for (const drawer of room.drawers) {
        const matchScore = 
          drawer.topic.name.toLowerCase().includes(q) ? 10 :
          drawer.topic.tagline.toLowerCase().includes(q) ? 5 :
          drawer.topic.tags.some(t => t.toLowerCase().includes(q)) ? 3 : 0;

        if (matchScore > 0) {
          results.push({
            wing: wing.name,
            room: room.name,
            drawer: drawer
          });
        }
      }
    }
  }

  return results;
}
