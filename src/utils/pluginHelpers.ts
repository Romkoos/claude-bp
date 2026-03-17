import { type Node } from '@xyflow/react';

export const PLUGIN_MIN_WIDTH = 400;
export const PLUGIN_MIN_HEIGHT = 200;

/** Find a plugin node whose bounding box contains the given flow position */
export function findPluginAtPosition(
  nodes: Node[],
  flowX: number,
  flowY: number,
  excludeNodeId: string
): Node | undefined {
  // Use findLast to match visual z-order (later in array = visually on top)
  return nodes.findLast((n) => {
    if (n.type !== 'plugin' || n.id === excludeNodeId) return false;
    const w = ((n.style as Record<string, unknown>)?.width as number) ?? n.measured?.width ?? PLUGIN_MIN_WIDTH;
    const h = ((n.style as Record<string, unknown>)?.height as number) ?? n.measured?.height ?? PLUGIN_MIN_HEIGHT;
    return (
      flowX >= n.position.x &&
      flowX <= n.position.x + w &&
      flowY >= n.position.y &&
      flowY <= n.position.y + h
    );
  });
}
