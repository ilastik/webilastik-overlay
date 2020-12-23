import { mat4, quat, vec3, vec4 } from 'gl-matrix'
import { BrushShaderProgram, BrushStroke } from './brush_stroke'
import { OrthoCamera } from './camera'
// import { PerspectiveCamera } from './camera'
import { CameraControls } from './controls'
import { RenderParams } from './gl'


export class BrushingOverlay{
    private canvas: HTMLCanvasElement
    private gl: WebGL2RenderingContext

    public readonly camera: OrthoCamera
    private camera_controls: CameraControls


    private brushStrokes: Array<BrushStroke> = []
    private renderer : BrushShaderProgram
    private device_to_view = mat4.create();

    private pixels_per_voxel = 10

    public setZoom(pixels_per_voxel: number){
        this.pixels_per_voxel = pixels_per_voxel
    }

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
        this.camera_controls = new CameraControls()
        this.renderer = new BrushShaderProgram(this.gl)

        //TODO: put camera looking at the center of the first slice of a dataset by default
        this.camera.lookAt({
            target_w: vec3.fromValues(0,0,0), position_w: vec3.fromValues(0, 0, 5), up_w: vec3.fromValues(0, 1, 0)
        })

        this.canvas.addEventListener("mousedown", (mouseDownEvent) => {
            let currentBrushStroke = new BrushStroke({
                gl: this.gl,
                start_postition: this.getMouseWorldPosition(mouseDownEvent),
                color: vec4.fromValues(0, 0, 1, 1),
                camera_position: this.camera.position_w,
                camera_orientation: this.camera.orientation,
            })
            this.brushStrokes.push(currentBrushStroke)

            let scribbleHandler = (mouseMoveEvent: MouseEvent) => {
                currentBrushStroke.add_voxel(this.getMouseWorldPosition(mouseMoveEvent))
            }
            let handlerCleanup = () => {
                this.canvas.removeEventListener("mousemove", scribbleHandler)
                document.removeEventListener("mouseup", handlerCleanup)
            }
            this.canvas.addEventListener("mousemove", scribbleHandler)
            document.addEventListener("mouseup", handlerCleanup)
        })

        window.requestAnimationFrame(this.render)
    }

    private getMouseWorldPosition(ev: MouseEvent): vec3{
        this.camera.get_device_to_world_matrix(this.device_to_view)

        let device_position = vec4.fromValues(
            (ev.offsetX - (this.canvas.scrollWidth / 2)) / (this.canvas.scrollWidth / 2),
           -(ev.offsetY - (this.canvas.scrollHeight / 2)) / (this.canvas.scrollHeight / 2),
            0, //FIXME: make sure this is compatible with camera near/far configs
            1
        )
        let world_position = vec4.create(); vec4.transformMat4(world_position, device_position, this.device_to_view)
        // console.log(`Device: ${vecToStr(device_position)}   World: ${vecToStr(world_position)}`)
        return vec3.fromValues(world_position[0], world_position[1], world_position[2])
    }

    public snapTo(brush_stroke: BrushStroke){
        this.camera.moveTo(brush_stroke.camera_position)
        this.camera.reorient(brush_stroke.camera_orientation)
    }

    private render = () => {
        const canvas = <HTMLCanvasElement>this.gl.canvas
        // const aspect = canvas.scrollWidth / canvas.scrollHeight // FIXME: maybe use ScrollWidth and ScrollHeight?

        //pixels_per_voxel determines the field of view, which is determined in voxel units
        this.camera.reconfigure({
            left: -canvas.scrollWidth / this.pixels_per_voxel / 2,
            right: canvas.scrollWidth / this.pixels_per_voxel / 2,
            near: 0,
            far: 1000, // This could be just 1... but oblique views might mess things up since a cube has length 1 * (3 ^ (1/2)) on opposite corners
            bottom: -canvas.scrollHeight / this.pixels_per_voxel / 2,
            top: canvas.scrollHeight / this.pixels_per_voxel / 2,
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
        // console.log(`Camera is at ${this.camera.position_w}`)

        this.renderer.render({brush_strokes: this.brushStrokes, camera: this.camera, renderParams: new RenderParams({})})

        window.requestAnimationFrame(this.render)
    }
}