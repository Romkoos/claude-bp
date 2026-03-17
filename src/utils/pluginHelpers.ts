import { type Node } from '@xyflow/react';

export const PLUGIN_MIN_WIDTH = 400;
export const PLUGIN_MIN_HEIGHT = 200;

/** Check if a child node's center (in relative coords) is outside its parent plugin bounds */
export function isNodeOutsidePlugin(childNode: Node, pluginNode: Node): boolean {
  const childW = (childNode.measured?.width ?? 300) as number;
  const childH = (childNode.measured?.height ?? 200) as number;
  const centerX = childNode.position.x + childW / 2;
  const centerY = childNode.position.y + childH / 2;

  const pluginW = ((pluginNode.style as Record<string, unknown>)?.width as number) ?? pluginNode.measured?.width ?? PLUGIN_MIN_WIDTH;
  const pluginH = ((pluginNode.style as Record<string, unknown>)?.height as number) ?? pluginNode.measured?.height ?? PLUGIN_MIN_HEIGHT;

  return centerX < 0 || centerX > pluginW || centerY < 0 || centerY > pluginH;
}

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
