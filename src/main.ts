import { mat4, quat, vec3 } from 'gl-matrix'
import { BrushingWidget } from '.'
import { FirstPersonCamera } from './controls'
import { changeOrientationBase, createElement } from './utils'
import { IViewerDriver } from './viewer_driver'

class DummyViewer{
    camera: FirstPersonCamera
    element: HTMLElement
    voxel_to_world: mat4
    zoom_in_pixels_per_voxel: number = 10
    constructor(){
        this.camera = new FirstPersonCamera({
            left: -1, right: 1, near: 0, far: 1, bottom: -1, top:  1
        })
        this.element = createElement({tagName: "div", parentElement: document.body, cssClasses: ["dummy_viewer"], inlineCss: {
            width: "400px",
            height: "300px",
            border: "solid 5px purple",
            backgroundColor: "black",
        }})
        this.voxel_to_world = mat4.fromScaling(mat4.create(), vec3.fromValues(1, 1, 1))
    }
}

const viewer = new DummyViewer();

const dummy_viewer_driver : IViewerDriver = {
    getTrackedElement: () => viewer.element,
    getViewportDrivers: () => [
        {
            getVoxelToWorldMatrix: () => viewer.voxel_to_world,
            getZoomInPixelsPerVoxel: () => viewer.zoom_in_pixels_per_voxel,
            getCameraPoseInVoxelSpace: () => {
                return {
                    position_vx: vec3.transformMat4(vec3.create(), viewer.camera.position_w, viewer.voxel_to_world),
                    orientation_vx: changeOrientationBase(viewer.camera.orientation, mat4.invert(mat4.create(), viewer.voxel_to_world))
                }
            },
            snapCameraTo: (position_vx: vec3, orientation_vx: quat) => {
                let position_w = vec3.transformMat4(vec3.create(), position_vx, viewer.voxel_to_world)
                let orientation_w = changeOrientationBase(orientation_vx, viewer.voxel_to_world)
                viewer.camera.snapTo(position_w, orientation_w)
            },
            getViewportGeometryInPixels: () => {
                return {
                    bottom: 0, left: 0, width: parseInt(viewer.element.style.width) - 10, height: parseInt(viewer.element.style.height) - 20,
                }
            }
        }
    ]
}



new BrushingWidget({
    parentElement: document.body,
    tracked_element: viewer.element,
    viewer_driver: dummy_viewer_driver,
})
