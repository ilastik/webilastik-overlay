import { mat4, quat, vec3 } from 'gl-matrix'
import { BrushingWidget } from '.'
import { createElement } from './utils'
import { IViewerDriver } from './viewer_driver'


// this is a stand-in for something like a neuroglancer "panel"
interface IDummyViewport{
    camera_position_vx: vec3;
    camera_orientation_vx: quat;
    zoom_in_pixels_per_voxel: number;
    voxel_to_world: mat4;

    bottom: number,
    left: number,
    width: number,
    height: number,
}

//This would be Neuroglancer or OpenSeaDragon, for example
class DummyViewer{
    element: HTMLElement
    viewports: Array<IDummyViewport>
    constructor(){
        this.element = createElement({
            tagName: "div",
            parentElement: document.body,
            cssClasses: ["DummyViewer"],
            inlineCss: {
                width: "400px",
                height: "300px",
                border: "solid 5px purple",
                backgroundColor: "black",
            }
        })
        this.viewports = [
            {
                camera_position_vx: vec3.fromValues(0,0,0),
                camera_orientation_vx: quat.create(),
                zoom_in_pixels_per_voxel: 10,
                voxel_to_world: mat4.create(),
                bottom: 0,
                left: 0,
                width: 100,
                height: 100,
            },
            {
                camera_position_vx: vec3.fromValues(0,0,0),
                camera_orientation_vx: quat.setAxisAngle(quat.create(), vec3.fromValues(0, 1, 0), Math.PI / 2),
                zoom_in_pixels_per_voxel: 10,
                voxel_to_world: mat4.create(),
                bottom: 0,
                left: 120,
                width: 100,
                height: 100,
            }
        ]
    }
}

const viewer = new DummyViewer();

const dummy_viewer_driver : IViewerDriver = {
    getTrackedElement: () => viewer.element,
    getViewportDrivers: () => viewer.viewports.map(viewport => ({
        getVoxelToWorldMatrix: () => viewport.voxel_to_world,
        getZoomInPixelsPerVoxel: () => viewport.zoom_in_pixels_per_voxel,
        getCameraPoseInVoxelSpace: () => {
            return {
                position_vx: viewport.camera_position_vx,
                orientation_vx: viewport.camera_orientation_vx,
            }
        },
        snapCameraTo: (position_vx: vec3, orientation_vx: quat) => {
            viewport.camera_position_vx = vec3.clone(position_vx)
            viewport.camera_orientation_vx = quat.clone(orientation_vx)
        },
        getGeometry: () => ({
            bottom: viewport.bottom,
            left: viewport.left,
            width: viewport.width,
            height: viewport.height,
        })
    }))
}


new BrushingWidget({
    parentElement: document.body,
    tracked_element: viewer.element,
    viewer_driver: dummy_viewer_driver,
})
