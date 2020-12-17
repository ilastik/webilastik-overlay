import { quat, vec3, vec4 } from 'gl-matrix'

import { SlicingCamera } from './camera'
import { OrthoCamera } from './camera'
// import { PerspectiveCamera } from './camera'
import { CameraControls } from './controls'


// let cube_controls = createElement({tagName: "div", parentElement: document.body})
// createElement({tagName: "label", parentElement: cube_controls, innerHTML: "Cube Y rotation (rads): "})
// let rads_input = createInput({inputType: "text", parentElement: cube_controls, value: "0.02"})

// let center_view_controls = createElement({tagName: "div", parentElement: document.body})
// createInput({inputType: "button", value: "Center cam on cube", parentElement: center_view_controls, click: () => {
//     camera.lookAt({target_w: cube.position, position_w: camera.position_w, up_w: vec3.fromValues(0, 1, 0), })
// }})

export class BrushStroke{}


export class BrushingOverlay{
    private canvas: HTMLCanvasElement
    private gl: WebGL2RenderingContext

    private camera: OrthoCamera
    private slicing_camera: SlicingCamera
    private camera_controls: CameraControls


    private brushStrokes: Array<Array<vec3>> = [[vec3.fromValues(0, 0, 0)]]

    public constructor({target, camera_position, camera_orientation}: {
        target: HTMLElement,
        camera_position?: vec3,
        camera_orientation?: quat
    }){
        if(target.style.position == "static"){
            throw "Can't overlay element with .style.position == 'static'"
        }
        this.canvas = document.createElement("canvas")
        this.canvas.style.position = "relative"
        this.canvas.style.height = "100%"
        this.canvas.style.width = "100%"
        this.canvas.style.top = "0"
        this.canvas.style.left = "0"
        this.canvas.style.border = "solid 3px orange"
        target.appendChild(this.canvas)

        this.gl = this.canvas.getContext("webgl2", {depth: true, stencil: true})!

        this.camera = new OrthoCamera({
            left: -5, right: 5, near: 0, far: 10, bottom: -5, top:  5,
            position: camera_position, orientation: camera_orientation
        })


        this.slicing_camera = new SlicingCamera(this.gl, this.camera)
        this.camera_controls = new CameraControls()

        //TODO: put camera looking at the center of the first slice of a dataset by default
        this.camera.lookAt({target_w: vec3.fromValues(0,0,0), position_w: vec3.fromValues(0, 0, 5), up_w: vec3.fromValues(0, 1, 0), })
        window.requestAnimationFrame(this.render)
    }

    private render = () => {
        const pixels_per_voxel = 10 // this is essentially "zoom" in ortho perspective and should be user-configurable
        const canvas = <HTMLCanvasElement>this.gl.canvas
        // const aspect = canvas.scrollWidth / canvas.scrollHeight // FIXME: maybe use ScrollWidth and ScrollHeight?

        //pixels_per_voxel determines the field of view, which is determined in voxel units
        this.camera.reconfigure({
            left: -canvas.scrollWidth / pixels_per_voxel / 2,
            right: canvas.scrollWidth / pixels_per_voxel / 2,
            near: 0,
            far: 10, // This could be just 1... but oblique views might mess things up since a cube has length 1 * (3 ^ (1/2)) on opposite corners
            bottom: -canvas.scrollHeight / pixels_per_voxel / 2,
            top: canvas.scrollHeight / pixels_per_voxel / 2,
        })

        //this sets the size of the framebuffer. It could end up with a different ratio between height and width when compared to the actual
        //displayed canvas. Still, the aspect ratio of the image should be correct because the Camera is setup using the canvas aspect.
        // Worst case scenario: pixel density in x will be different from pixeol density in y, but proportions of the rendered image
        //will still be correct

        //set the actual amount of pixels with which to render
        canvas.width = canvas.scrollWidth
        canvas.height = canvas.scrollHeight
        //tells webgl where to render stuff ((0,0)) and how to scale units into pixels
        this.gl.viewport(0, 0, canvas.scrollWidth, canvas.scrollHeight); //FIXME: shuold aspect play a role here?
        this.camera_controls.updateCamera(this.camera);
        console.log(`Camera is at ${this.camera.position_w}`)

        for(let brushStroke of this.brushStrokes){
            this.slicing_camera.renderBrushStroke({brushStroke, color: vec4.fromValues(0,0,1, 1)});
        }

        window.requestAnimationFrame(this.render)
    }
}