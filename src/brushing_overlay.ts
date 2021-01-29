import { mat4, quat, vec3 } from 'gl-matrix'
import { BrushelBoxRenderer } from './brush_boxes_renderer'
// import { BrushShaderProgram } from './brush_stroke'
import { BrushStroke } from './brush_stroke'
import { OrthoCamera } from './camera'
// import { PerspectiveCamera } from './camera'
import { CameraControls } from './controls'
import { ClearConfig, RenderParams } from './gl'
import { coverContents, createElement, createInput, InlineCss, insertAfter, vec3ToRgb, vecToString } from './utils'


export class BrushingOverlay{
    public readonly canvas: HTMLCanvasElement
    public readonly gl: WebGL2RenderingContext
    public readonly trackedElement: HTMLElement

    public readonly camera: OrthoCamera
    public readonly voxelToWorld: mat4
    public readonly worldToVoxel: mat4

    private camera_controls: CameraControls
    private pixelsPerVoxel: number
    // private renderer : BrushShaderProgram
    private renderer : BrushelBoxRenderer

    public constructor({
        trackedElement,
        camera_position,
        camera_orientation,
        voxelToWorld,
        pixelsPerVoxel,
    }: {
        trackedElement: HTMLElement, //element over which the overlay will always be
        camera_position?: vec3, //camera position in world coordinates
        camera_orientation?: quat,
        voxelToWorld: mat4,
        pixelsPerVoxel: number //orthogonal zoom; how many pixels (the smallest dimension of) the voxel should occupy on screen
    }){
        this.voxelToWorld = mat4.clone(voxelToWorld);
        this.worldToVoxel = mat4.invert(mat4.create(), voxelToWorld);
        this.setZoom(pixelsPerVoxel)
        this.trackedElement = trackedElement
        this.canvas = document.createElement("canvas"); //<HTMLCanvasElement>createElement({tagName: "canvas", parentElement: trackedElement.parentElement || document.body})
        insertAfter({reference: trackedElement, new_element: this.canvas})
        this.canvas.style.zIndex = trackedElement.style.zIndex

        this.gl = this.canvas.getContext("webgl2", {depth: true, stencil: true})!
        this.camera = new OrthoCamera({
            left: -1, right: 1, near: 0, far: 1, bottom: -1, top:  1, //all these params are meaningless; they are overwritten every frame
            position: camera_position, orientation: camera_orientation
        })
        this.camera_controls = new CameraControls()
        this.renderer = new BrushelBoxRenderer(this.gl)
    }

    public setZoom(pixelsPerVoxel: number){
        this.pixelsPerVoxel = pixelsPerVoxel
    }

    public getMouseClipPosition(ev: MouseEvent): vec3{
        let position_c = vec3.fromValues(
            (ev.offsetX - (this.canvas.scrollWidth / 2)) / (this.canvas.scrollWidth / 2),
           -(ev.offsetY - (this.canvas.scrollHeight / 2)) / (this.canvas.scrollHeight / 2), //viewport +y points up, but mouse events have +y pointing down
            0, //FIXME: make sure this is compatible with camera near/far configs
        )
        // console.log(`ev.offsetY: ${ev.offsetY}`)
        // console.log(`ClipPosition: ${vecToString(position_c)}`)
        return position_c
    }

    public getMouseWorldPosition(ev: MouseEvent): vec3{
        let position_c = this.getMouseClipPosition(ev)
        let position_w = vec3.transformMat4(vec3.create(), position_c, this.camera.clip_to_world)
        // console.log(`WorldPosition: ${vecToString(position_w)}`)
        return position_w
    }

    public getMouseVoxelPosition(ev: MouseEvent): vec3{
        let position_w = this.getMouseWorldPosition(ev)
        let position_vx = vec3.transformMat4(vec3.create(), position_w, this.worldToVoxel)
        // console.log(`VoxelPosition: ${vecToString(position_vx)} ======================`)
        return position_vx
    }

    public snapTo(camera_position: vec3, camera_orientation: quat){
        this.camera.moveTo(camera_position)
        this.camera.reorient(camera_orientation)
    }

    public render = (brushStrokes: Array<BrushStroke>) => {
        const canvas = <HTMLCanvasElement>this.gl.canvas
        coverContents({target: this.trackedElement, overlay: canvas})

        //left, right, top, bottom, near and far are measured in voxels; pixelsPerVoxel determines the field of view
        this.camera.reconfigure({
            left: -canvas.scrollWidth / this.pixelsPerVoxel / 2,
            right: canvas.scrollWidth / this.pixelsPerVoxel / 2,
            near: 0,
            far: 10, // This could be just 1... but oblique views might mess things up since a cube has length 1 * (3 ^ (1/2)) on opposite corners
            bottom: -canvas.scrollHeight / this.pixelsPerVoxel / 2,
            top: canvas.scrollHeight / this.pixelsPerVoxel / 2,
        })

        canvas.width = canvas.scrollWidth
        canvas.height = canvas.scrollHeight
        this.gl.viewport(0, 0, canvas.scrollWidth, canvas.scrollHeight); //FIXME: shuold aspect play a role here?
        this.camera_controls.updateCamera(this.camera);

        this.renderer.render({
            brush_strokes: brushStrokes,
            camera: this.camera,
            voxelToWorld: this.voxelToWorld,
            renderParams: new RenderParams({
                clearConfig: new ClearConfig({
                    a: 0.0,
                })
            })
        })
    }
}

export class BrushingWidget{
    public readonly element: HTMLElement
    public readonly colorPicker: HTMLInputElement
    private readonly brushStrokesContainer: HTMLElement

    public currentBrushColor: vec3
    private readonly overlay: BrushingOverlay
    private brushStrokeWidgets: Array<BrushStrokeWidget> = []

    private lastMouseMoveEvent: MouseEvent = new MouseEvent("mousemove")

    constructor({container, overlay, inlineCss}: {
        container: HTMLElement,
        overlay: BrushingOverlay,
        inlineCss?: InlineCss
    }){
        this.overlay = overlay
        this.element = createElement({tagName: "div", parentElement: container, inlineCss: inlineCss || {
            display: "table",
            border: "solid 2px black",
        }})

        let cameraPositionContainer = createElement({tagName: "div", parentElement: this.element, inlineCss: {fontFamily: "monospace"}})
            createElement({tagName: "h2", parentElement: cameraPositionContainer, innerHTML: "Camera Position"})

                createElement({tagName: "label", parentElement:cameraPositionContainer, innerHTML: "world: "})
                const camera_pos_world_display = createInput({inputType: "text", parentElement: cameraPositionContainer})

                createElement({tagName: "label", parentElement:cameraPositionContainer, innerHTML: "voxel: "})
                const camera_pos_voxel_display = createInput({inputType: "text", parentElement: cameraPositionContainer})

            createElement({tagName: "h2", parentElement: cameraPositionContainer, innerHTML: "Cursor Position"})

                createElement({tagName: "label", parentElement:cameraPositionContainer, innerHTML: "world: "})
                const mouse_pos_world_display = createInput({inputType: "text", parentElement: cameraPositionContainer})

                createElement({tagName: "label", parentElement:cameraPositionContainer, innerHTML: "voxel: "})
                const mouse_pos_voxel_display = createInput({inputType: "text", parentElement: cameraPositionContainer})

        createElement({tagName: "label", parentElement: this.element, innerHTML: "Brush Color: "})
        this.colorPicker = createInput({inputType: "color", parentElement: this.element, value: "#00ff00"})
        let updateColor =  () => {
            let channels = this.colorPicker.value.slice(1).match(/../g)!.map(c => parseInt(c, 16) / 255)
            this.currentBrushColor = vec3.fromValues(channels[0], channels[1], channels[2])
        }
        this.colorPicker.addEventListener("change", updateColor)
        updateColor()

        createElement({tagName: "h1", innerHTML: "Brush Strokes", parentElement: this.element})
        this.brushStrokesContainer = createElement({tagName: "ul", parentElement: this.element})

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

        this.overlay.canvas.addEventListener("mousemove", (mouseMoveEvent: MouseEvent) => {
            this.lastMouseMoveEvent = mouseMoveEvent //store the event so the mouse displays refresh even without moving the mouse
        })

        let render = () => {
            this.overlay.render(this.brushStrokeWidgets.map(w => w.brushStroke))

            const camera_pos_w = this.overlay.camera.position_w;
            camera_pos_world_display.value = vecToString(camera_pos_w)
            camera_pos_voxel_display.value = vecToString(vec3.transformMat4(vec3.create(), camera_pos_w, this.overlay.worldToVoxel))

            const mouseWorldPosition = this.overlay.getMouseWorldPosition(this.lastMouseMoveEvent)
            mouse_pos_world_display.value = vecToString(mouseWorldPosition)
            const mouseVoxelPosition = this.overlay.getMouseVoxelPosition(this.lastMouseMoveEvent)
            mouse_pos_voxel_display.value = vecToString(mouseVoxelPosition)

            window.requestAnimationFrame(render)
        }

        window.requestAnimationFrame(render)
    }

    public addBrushStroke(brushStroke: BrushStroke){
        this.brushStrokeWidgets.push(
            new BrushStrokeWidget({
                brushStroke,
                parentElement: this.brushStrokesContainer,
                onClick: () => {
                    this.overlay.snapTo(brushStroke.camera_position, brushStroke.camera_orientation)
                }
            })
        )
    }
}

export class BrushStrokeWidget{
    public readonly element: HTMLElement
    public readonly brushStroke: BrushStroke

    constructor({brushStroke, parentElement, onClick}:{
        brushStroke: BrushStroke,
        parentElement: HTMLElement,
        onClick? : (event: MouseEvent) => void,
    }){
        this.brushStroke = brushStroke
        this.element = createElement({
            tagName: "li",
            parentElement,
            innerHTML: vec3ToRgb(brushStroke.color) + ` at ${vecToString(brushStroke.getVertRef(0))}`,
            inlineCss: {
                color: vec3ToRgb(brushStroke.color)
            },
            onClick: onClick
        })
    }
}
