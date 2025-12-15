/**
 * Local ambient declaration file for @nivo packages
 * Temporary: cast unknown @nivo/* imports to any until proper prop types are enforced.
 * Replace with real typed usage later.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
declare module '@nivo/bar' {
  const _default: any;
  export default _default;
  export const ResponsiveBar: any;
}
declare module '@nivo/line' {
  const _default: any;
  export default _default;
  export const ResponsiveLine: any;
}
declare module '@nivo/core' {
  const _default: any;
  export default _default;
}
declare module '@nivo/pie' {
  const _default: any;
  export default _default;
  export const ResponsivePie: any;
}
declare module '@nivo/legends' {
  const _default: any;
  export default _default;
}
declare module '@nivo/heatmap' {
  const _default: any;
  export default _default;
  export const ResponsiveHeatMap: any;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

