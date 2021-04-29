import { mat4, quat, vec3 } from "gl-matrix";

export interface IViewerDriver{
     //camera position in voxel coordinates
    getCameraPositionInVoxelSpace: () => vec3;
    getCameraOrientation: () => quat;
     //converts from voxel to worlkd space. Scaling part must have at least one axis set to 1
    getVoxelToWorldMatrix: () => mat4;
     //orthogonal zoom; must be positive. Describes how many pixels (the smallest dimension of) the voxel should occupy on screen
    getZoomInPixelsPerVoxel: () => number;

    snapCameraTo?: (voxel_position: vec3, orientation: quat) => any;
}

export class NeuroglancerViewerDriver implements IViewerDriver{
    constructor(public readonly viewer: any){}

    getVoxelToWorldMatrix = () => mat4.fromScaling(mat4.create(), vec3.fromValues(1, -1, -1))

    getZoomInPixelsPerVoxel = () => 1 / this.viewer.navigationState.zoomFactor.value

    getCameraPositionInVoxelSpace = () => this.viewer.navigationState.pose.position.value as vec3

    getCameraOrientation = () => {
        let camera_orientation_vx: quat = this.viewer.navigationState.pose.orientation.orientation
        const rotation_axis_vx = vec3.create();
        const rotation_rads = quat.getAxisAngle(rotation_axis_vx, camera_orientation_vx)
        // console.log(`Original quat (voxel?) ${quatToAxisAngleString(viewer.navigationState.pose.orientation.orientation)}`)
        const rotation_axis_w = vec3.transformMat4(vec3.create(), rotation_axis_vx, this.getVoxelToWorldMatrix());
        return quat.setAxisAngle(quat.create(), rotation_axis_w, rotation_rads)
    }
}
