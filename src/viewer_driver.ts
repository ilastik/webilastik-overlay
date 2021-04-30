import { mat4, quat, vec3 } from "gl-matrix";

export interface IViewerDriver{
    getViewportDrivers: () => Array<IViewportDriver>;
    getTrackedElement: () => HTMLElement;
}

export interface IViewportDriver{
    getViewportGeometryInPixels(): {left: number, top: number, width: number, height: number};
    //gets camera position in voxel coordinates
    getCameraPositionInVoxelSpace(): vec3;
    //gets camera orientation relative to the Voxel Space
    getCameraOrientationInVoxelSpace(): quat;
     //get a mat4 tjat converts from voxel to worlkd space. Scaling part must have at least one axis set to 1
    getVoxelToWorldMatrix(): mat4;
     //orthogonal zoom; must be positive. Describes how many pixels (the smallest dimension of) the voxel should occupy on screen
    getZoomInPixelsPerVoxel(): number;
    snapCameraTo?: (voxel_position: vec3, orientation: quat) => any;
}
