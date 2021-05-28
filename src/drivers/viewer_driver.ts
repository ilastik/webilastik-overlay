import { mat4, quat, vec3 } from "gl-matrix";

export type NewViewportsHander = (new_viewport_drivers: Array<IViewportDriver>) => void;

export interface IViewerDriver{
    getViewportDrivers: () => Promise<Array<IViewportDriver>>;
    getTrackedElement: () => HTMLElement;
    refreshViews: (views: Array<{name: string, url: string}>, channel_colors: Array<vec3>) => void;
    onViewportsChanged?: (handler: NewViewportsHander) => void;
}

//TThe dimensions and offset of a viewport within a viewer, measured in pixels
export interface IViewportGeometry{
    left: number;
    bottom: number;
    width: number;
    height: number;
}

export interface IViewportInjectionParams{
    precedingElement?: HTMLElement;
    zIndex?: string
}

// A viewer can be broken down into multiple viewports, that is, multiple non-overlapping
// mini-screens within the main view where it can show the same data, but from different angles or
// with different viewing options. A IViewerDriver should provide as many of these viewport drivers
// as there are "brushable" viewports in the viewer.
//
// The reason to have multiple IVewportDriver instead of simply having multiple IViewerDrivers
// is that by splitting a single canvas into multiple viewports it is possible to have a single webgl
// context be shared between them.
export interface IViewportDriver{
    data_url: string;
    getGeometry(): IViewportGeometry;
    //gets camera pose in voxel coordinates
    getCameraPoseInVoxelSpace(): {position_vx: vec3, orientation_vx: quat};
     //get a mat4 tjat converts from voxel to worlkd space. Scaling part must have at least one axis set to 1
    getVoxelToWorldMatrix(): mat4;
     //orthogonal zoom; must be positive. Describes how many pixels (the smallest dimension of) the voxel should occupy on screen
    getZoomInPixelsPerVoxel(): number;
    snapCameraTo?: (voxel_position: vec3, orientation: quat) => any;
    getInjectionParams?: () => IViewportInjectionParams
}
