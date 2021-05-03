import { mat4, quat, vec3 } from "gl-matrix";

export type NewViewportsHander = (new_viewport_drivers: Array<IViewportDriver>) => void;

export interface IViewerDriver{
    getViewportDrivers: () => Array<IViewportDriver>;
    getTrackedElement: () => HTMLElement;
    onViewportsChanged?: (handler: NewViewportsHander) => void;
}

//TThe dimensions and offset of a viewport within a viewer, measured in pixels
export interface IViewportGeometry{
    left: number;
    bottom: number;
    width: number;
    height: number;
}

export interface IViewportDriver{
    getGeometry(): IViewportGeometry;
    //gets camera pose in voxel coordinates
    getCameraPoseInVoxelSpace(): {position_vx: vec3, orientation_vx: quat};
     //get a mat4 tjat converts from voxel to worlkd space. Scaling part must have at least one axis set to 1
    getVoxelToWorldMatrix(): mat4;
     //orthogonal zoom; must be positive. Describes how many pixels (the smallest dimension of) the voxel should occupy on screen
    getZoomInPixelsPerVoxel(): number;
    snapCameraTo?: (voxel_position: vec3, orientation: quat) => any;
}
