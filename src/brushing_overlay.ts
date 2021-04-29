import { mat4, vec3 } from 'gl-matrix'
import { BrushRenderer } from './brush_renderer'
// import { BrushShaderProgram } from './brush_stroke'
import { BrushStroke, IBrushStrokeHandler } from './brush_stroke'
import { OrthoCamera } from './camera'
// import { PerspectiveCamera } from './camera'
import { ClearConfig, RenderParams } from './gl'
import { coverContents, insertAfter } from './utils'
import { IViewerDriver } from './viewer_driver'


export class BrushingOverlay{
    public readonly canvas: HTMLCanvasElement
    public readonly gl: WebGL2RenderingContext
    public readonly trackedElement: HTMLElement
    public readonly viewer_driver
    public readonly camera: OrthoCamera

    public constructor({
        trackedElement,
        viewer_driver,
        brush_stroke_handler,
    }: {
        trackedElement: HTMLElement, //element over which the overlay will always be
        viewer_driver: IViewerDriver,
        brush_stroke_handler: IBrushStrokeHandler,
    }){
        this.viewer_driver = viewer_driver
        this.trackedElement = trackedElement
        this.canvas = document.createElement("canvas"); //<HTMLCanvasElement>createElement({tagName: "canvas", parentElement: trackedElement.parentElement || document.body})
        insertAfter({reference: trackedElement, new_element: this.canvas})
        this.canvas.style.zIndex = trackedElement.style.zIndex

        this.gl = this.canvas.getContext("webgl2", {depth: true, stencil: true})!
        this.camera = new OrthoCamera({
            left: -1, right: 1, near: 0, far: 1, bottom: -1, top:  1, //all these params are meaningless; they are overwritten every frame
        })

        new ResizeObserver(() => {
            coverContents({target: trackedElement, overlay: this.canvas})
        }).observe(trackedElement)

        this.canvas.addEventListener("mousedown", (mouseDownEvent: MouseEvent) => {
            let currentBrushStroke = new BrushStroke({
                gl: this.gl,
                start_postition: this.getMouseVoxelPosition(mouseDownEvent),
                color: brush_stroke_handler.getCurrentColor(),
                camera_orientation: viewer_driver.getCameraOrientation(),
            })
            brush_stroke_handler.handleNewBrushStroke(currentBrushStroke)

            let scribbleHandler = (mouseMoveEvent: MouseEvent) => {
                currentBrushStroke.add_voxel(this.getMouseVoxelPosition(mouseMoveEvent))
            }

            let handlerCleanup = () => {
                this.canvas.removeEventListener("mousemove", scribbleHandler)
                document.removeEventListener("mouseup", handlerCleanup)
            }
            this.canvas.addEventListener("mousemove", scribbleHandler)
            document.addEventListener("mouseup", handlerCleanup)
        })
    }

    public getMouseClipPosition(ev: MouseEvent): vec3{
        let position_c = vec3.fromValues(
            (ev.offsetX - (this.canvas.scrollWidth / 2)) / (this.canvas.scrollWidth / 2),
           -(ev.offsetY - (this.canvas.scrollHeight / 2)) / (this.canvas.scrollHeight / 2), //gl viewport +y points up, but mouse events have +y pointing down
            0, //Assume slicing plane is in the MIDDLE of clip space
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
        const world_to_voxel = mat4.invert(mat4.create(), this.viewer_driver.getVoxelToWorldMatrix())
        let position_w = this.getMouseWorldPosition(ev)
        let position_vx = vec3.transformMat4(vec3.create(), position_w, world_to_voxel)
        // console.log(`VoxelPosition: ${vecToString(position_vx)} ======================`)
        return position_vx
    }

    public render = (brushStrokes: Array<BrushStroke>, renderer: BrushRenderer) => {
        // - left, right, top, bottom, near and far are measured in world-space-units;
        //      - 1 world-space-unit is the smallest side of a voxel, as determined by this.voxelToWorld
        //           - For isotropic data, it's simply 1
        // - pixelsPerVoxel determines the zoom/field of view;
        // - near and far have to be such that a voxel in any orientation would fit between them;
        const pixels_per_voxel = this.viewer_driver.getZoomInPixelsPerVoxel()
        const voxel_diagonal_length = 10//vec3.length(mat4.getScaling(vec3.create(), this.voxelToWorld))
        const canvas_width_in_voxels = this.canvas.scrollWidth / pixels_per_voxel
        const canvas_height_in_voxels = this.canvas.scrollHeight / pixels_per_voxel
        this.camera.reconfigure({
            left: -canvas_width_in_voxels / 2,
            right: canvas_width_in_voxels / 2,
            near: -voxel_diagonal_length,
            far: voxel_diagonal_length,
            bottom: -canvas_height_in_voxels / 2,
            top: canvas_height_in_voxels / 2,
            position: vec3.transformMat4(vec3.create(), this.viewer_driver.getCameraPositionInVoxelSpace(), this.viewer_driver.getVoxelToWorldMatrix()),
            orientation: this.viewer_driver.getCameraOrientation(),
        })

        this.canvas.width = this.canvas.scrollWidth
        this.canvas.height = this.canvas.scrollHeight
        this.gl.viewport(0, 0, this.canvas.scrollWidth, this.canvas.scrollHeight); //FIXME: shuold aspect play a role here?

        renderer.render({
            brush_strokes: brushStrokes,
            camera: this.camera,
            voxelToWorld: this.viewer_driver.getVoxelToWorldMatrix(),
            renderParams: new RenderParams({
                clearConfig: new ClearConfig({
                    a: 0.0,
                })
            })
        })
    }
}
