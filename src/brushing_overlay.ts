import { mat4, quat, vec3 } from 'gl-matrix'
import { BrushShaderProgram, BrushStroke, VoxelShape } from './brush_stroke'
import { OrthoCamera } from './camera'
// import { PerspectiveCamera } from './camera'
import { CameraControls } from './controls'
import { RenderParams } from './gl'
import { coverContents, createElement, createInput } from './utils'


export class BrushingOverlay{
    public readonly canvas: HTMLCanvasElement
    public readonly gl: WebGL2RenderingContext
    public readonly trackedElement: HTMLElement

    public readonly camera: OrthoCamera
    public readonly voxelShape: VoxelShape

    private camera_controls: CameraControls
    private pixelsPerVoxel: number
    private renderer : BrushShaderProgram
    private device_to_view = mat4.create();


    public constructor({
        trackedElement,
        camera_position,
        camera_orientation,
        voxelShape,
        pixelsPerVoxel,
    }: {
        trackedElement: HTMLElement, //element over which the overlay will always be
        camera_position?: vec3, //camera position in world coordinates
        camera_orientation?: quat,
        voxelShape: VoxelShape,
        pixelsPerVoxel: number //orthogonal zoom; how many pixels (the smallest dimension of) the voxel should occupy on screen
    }){
        this.voxelShape = voxelShape
        this.setZoom(pixelsPerVoxel)
        this.trackedElement = trackedElement
        this.canvas = <HTMLCanvasElement>createElement({tagName: "canvas", parentElement: trackedElement.parentElement || document.body})

        this.gl = this.canvas.getContext("webgl2", {depth: true, stencil: true})!
        this.camera = new OrthoCamera({
            left: -5, right: 5, near: 0, far: 10, bottom: -5, top:  5,
            position: camera_position, orientation: camera_orientation
        })
        this.camera_controls = new CameraControls()
        this.renderer = new BrushShaderProgram(this.gl)
    }

    public setZoom(pixelsPerVoxel: number){
        this.pixelsPerVoxel = pixelsPerVoxel
    }

    public getMouseDevicePosition(ev: MouseEvent): vec3{
        let out = vec3.fromValues(
            (ev.offsetX - (this.canvas.scrollWidth / 2)) / (this.canvas.scrollWidth / 2),
           -(ev.offsetY - (this.canvas.scrollHeight / 2)) / (this.canvas.scrollHeight / 2),
            0, //FIXME: make sure this is compatible with camera near/far configs
        )
        // console.log(`DevicePosition: ${out}`)
        return out
    }

    public getMouseWorldPosition(ev: MouseEvent): vec3{
        this.camera.get_device_to_world_matrix(this.device_to_view)
        let device_position = this.getMouseDevicePosition(ev)
        let out = vec3.create(); vec3.transformMat4(out, device_position, this.device_to_view)
        // console.log(`WorldPosition: ${out}`)
        return out
    }

    public getMouseVoxelPosition(ev: MouseEvent): vec3{
        let world_position = this.getMouseWorldPosition(ev)
        let out = vec3.create(); vec3.transformMat4(out, world_position, this.voxelShape.worldToVoxelMatrix)
        // console.log(`VoxelPosition: ${out} ======================`)
        return out
    }

    public snapTo(camera_position: vec3, camera_orientation: quat){
        this.camera.moveTo(camera_position)
        this.camera.reorient(camera_orientation)
    }

    public render = (brushStrokes: Array<BrushStroke>) => {
        const canvas = <HTMLCanvasElement>this.gl.canvas
        coverContents({target: this.trackedElement, overlay: canvas})
        // const aspect = canvas.scrollWidth / canvas.scrollHeight // FIXME: maybe use ScrollWidth and ScrollHeight?

        //pixelsPerVoxel determines the field of view
        this.camera.reconfigure({
            left: -canvas.scrollWidth / this.pixelsPerVoxel / 2,
            right: canvas.scrollWidth / this.pixelsPerVoxel / 2,
            near: 0,
            far: 1000, // This could be just 1... but oblique views might mess things up since a cube has length 1 * (3 ^ (1/2)) on opposite corners
            bottom: -canvas.scrollHeight / this.pixelsPerVoxel / 2,
            top: canvas.scrollHeight / this.pixelsPerVoxel / 2,
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

        this.renderer.render({
            brush_strokes: brushStrokes,
            camera: this.camera,
            voxelShape: this.voxelShape,
            renderParams: new RenderParams({})})
    }
}

export class BrushingWidget{
    public readonly element: HTMLElement
    public readonly colorPicker: HTMLInputElement
    private readonly brushStrokesContainer: HTMLElement

    public currentBrushColor: vec3
    private readonly overlay: BrushingOverlay
    private brushStrokeWidgets: Array<BrushStrokeWidget> = []

    constructor({container, overlay}: {
        container: HTMLElement,
        overlay: BrushingOverlay,
    }){
        this.element = createElement({tagName: "div", parentElement: container, inlineCss: {
            width: "300px",
            height: "300px",
            border: "solid 2px black",
        }})
        createElement({tagName: "span", parentElement: this.element, innerHTML: "Brush Color: "})
        this.colorPicker = createInput({inputType: "color", parentElement: this.element, value: "#00ff00"})
        let updateColor =  () => {
            let channels = this.colorPicker.value.slice(1).match(/../g)!.map(c => parseInt(c, 16) / 255)
            this.currentBrushColor = vec3.fromValues(channels[0], channels[1], channels[2])
        }
        this.colorPicker.addEventListener("change", updateColor)
        updateColor()
        createElement({tagName: "h1", innerHTML: "Brush Strokes", parentElement: this.element})
        this.brushStrokesContainer = createElement({tagName: "ul", parentElement: this.element})

        this.overlay = overlay
        this.overlay.canvas.addEventListener("mousedown", (mouseDownEvent: MouseEvent) => {
            let currentBrushStroke = new BrushStroke({
                gl: this.overlay.gl,
                start_postition: this.overlay.getMouseVoxelPosition(mouseDownEvent),
                color: this.currentBrushColor,
                camera_position: this.overlay.camera.position_w,
                camera_orientation: this.overlay.camera.orientation,
            })
            this.addBrushStroke(currentBrushStroke)

            let scribbleHandler = (mouseMoveEvent: MouseEvent) => {
                currentBrushStroke.add_voxel(this.overlay.getMouseVoxelPosition(mouseMoveEvent))
            }
            let handlerCleanup = () => {
                this.overlay.canvas.removeEventListener("mousemove", scribbleHandler)
                document.removeEventListener("mouseup", handlerCleanup)
            }
            this.overlay.canvas.addEventListener("mousemove", scribbleHandler)
            document.addEventListener("mouseup", handlerCleanup)
        })

        let render = () => {
            this.overlay.render(this.brushStrokeWidgets.map(w => w.brushStroke))
            window.requestAnimationFrame(render)
        }

        window.requestAnimationFrame(render)
    }

    public addBrushStroke(brushStroke: BrushStroke){
        let stroke_widget = new BrushStrokeWidget(
            brushStroke,
            this.brushStrokesContainer
        )
        this.brushStrokeWidgets.push(stroke_widget)
        stroke_widget.element.addEventListener("click", () => {
            this.overlay.snapTo(brushStroke.camera_position, brushStroke.camera_orientation)
        })
    }
}

function vec3ToRgb(value: vec3): string{
    return "rgb(" + value.map((c: number) => Math.floor(c * 255)).join(", ") + ")"
}

function vec3ToString(value: vec3): string{
    return `<${value[0].toFixed(1)}, ${value[1].toFixed(1)}, ${value[2].toFixed(1)}>`
}

export class BrushStrokeWidget{
    public readonly element: HTMLElement
    constructor(public readonly brushStroke: BrushStroke, parentElement: HTMLElement){
        this.element = createElement({
            tagName: "li",
            parentElement,
            innerHTML: vec3ToRgb(brushStroke.color) + ` at ${vec3ToString(brushStroke.getVertRef(0))}`,
            inlineCss: {
                color: vec3ToRgb(brushStroke.color)
            }
        })
    }
}
