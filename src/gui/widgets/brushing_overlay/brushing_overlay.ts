import { mat4, quat, vec3 } from 'gl-matrix'
import { BrushRenderer } from './brush_renderer'
// import { BrushShaderProgram } from './brush_stroke'
import { OrthoCamera } from './camera'
// import { PerspectiveCamera } from './camera'
import { ClearConfig, RenderParams, ScissorConfig } from '../../../gl/gl'
import { changeOrientationBase, coverContents, createElement, insertAfter } from '../../../util/misc'
import { IViewerDriver, IViewportDriver } from '../../../drivers/viewer_driver'
import { IBrushStrokeHandler, BrushStroke } from './brush_stroke'


export class OverlayViewport{
    public readonly gl: WebGL2RenderingContext
    public readonly canvas: HTMLCanvasElement
    public readonly viewport_driver: IViewportDriver
    public readonly element: HTMLElement

    public constructor({
        viewport_driver,
        brush_stroke_handler,
        gl,
    }: {
        viewport_driver: IViewportDriver,
        brush_stroke_handler: IBrushStrokeHandler,
        gl: WebGL2RenderingContext,
    }){
        this.viewport_driver = viewport_driver
        this.gl = gl
        this.canvas = this.gl.canvas as HTMLCanvasElement
        this.element = document.createElement("div")
        this.element.classList.add("OverlayViewport")


        document.body.lastElementChild
        const injection_params = viewport_driver.getInjectionParams ? viewport_driver.getInjectionParams() : {
            precedingElement: undefined,
            zIndex: undefined,
        }
        insertAfter({
            new_element: this.element,
            reference: injection_params.precedingElement || document.body.lastElementChild as HTMLElement
        })
        this.element.style.zIndex = injection_params.zIndex || "auto"

        let colors = ["red", "green", "blue", "orange", "purple", "lime", "olive", "navy"]
        this.element.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
        this.element.style.filter = "opacity(0.3)"

        this.element.addEventListener("mousedown", (mouseDownEvent: MouseEvent) => {
            let currentBrushStroke = new BrushStroke({
                gl: this.gl,
                start_postition: this.getMouseVoxelPosition(mouseDownEvent),
                color: brush_stroke_handler.getCurrentColor(),
                annotated_data_url: viewport_driver.getDataUrl(),
                camera_orientation: viewport_driver.getCameraPoseInVoxelSpace().orientation_vx, //FIXME: realy voxel space? rename param in BrushStroke?
            })
            brush_stroke_handler.handleNewBrushStroke(currentBrushStroke)

            let scribbleHandler = (mouseMoveEvent: MouseEvent) => {
                currentBrushStroke.add_voxel(this.getMouseVoxelPosition(mouseMoveEvent))
            }

            let handlerCleanup = () => {
                this.element.removeEventListener("mousemove", scribbleHandler)
                document.removeEventListener("mouseup", handlerCleanup)
                brush_stroke_handler.handleFinishedBrushStroke(currentBrushStroke)
            }
            this.element.addEventListener("mousemove", scribbleHandler)
            document.addEventListener("mouseup", handlerCleanup)
        })
    }

    public setBrushingEnabled(enabled: boolean){
        this.element.style.pointerEvents = enabled ? "auto" : "none"
    }

    public getCameraPoseInWorldSpace(): {position_w: vec3, orientation_w: quat}{
        const pose_vx = this.viewport_driver.getCameraPoseInVoxelSpace()
        const voxel_to_world = this.viewport_driver.getVoxelToWorldMatrix()
        return {
            position_w: vec3.transformMat4(
                vec3.create(), pose_vx.position_vx, voxel_to_world
            ),
            orientation_w: changeOrientationBase(pose_vx.orientation_vx, voxel_to_world),
        }
    }

    public getCamera(): OrthoCamera{
        // - left, right, top, bottom, near and far are measured in world-space-units;
        //      - 1 world-space-unit is the smallest side of a voxel, as determined by this.voxelToWorld
        //           - For isotropic data, it's simply 1
        // - pixelsPerVoxel determines the zoom/field of view;
        // - near and far have to be such that a voxel in any orientation would fit between them;
        const pixels_per_voxel = this.viewport_driver.getZoomInPixelsPerVoxel()
        const voxel_diagonal_length = vec3.length(mat4.getScaling(vec3.create(), this.viewport_driver.getVoxelToWorldMatrix()))
        const viewport_width_in_voxels = this.element.scrollWidth / pixels_per_voxel
        const viewport_height_in_voxels = this.element.scrollHeight / pixels_per_voxel
        const camera_pose_w = this.getCameraPoseInWorldSpace()
        return new OrthoCamera({
            left: -viewport_width_in_voxels / 2,
            right: viewport_width_in_voxels / 2,
            near: -voxel_diagonal_length,
            far: voxel_diagonal_length,
            bottom: -viewport_height_in_voxels / 2,
            top: viewport_height_in_voxels / 2,
            position: camera_pose_w.position_w,
            orientation: camera_pose_w.orientation_w,
        })
    }

    public getMouseClipPosition(ev: MouseEvent): vec3{
        let position_c = vec3.fromValues(
            (ev.offsetX - (this.element.scrollWidth / 2)) / (this.element.scrollWidth / 2),
           -(ev.offsetY - (this.element.scrollHeight / 2)) / (this.element.scrollHeight / 2), //gl viewport +y points up, but mouse events have +y pointing down
            0, //Assume slicing plane is in the MIDDLE of clip space
        )
        // console.log(`ev.offsetY: ${ev.offsetY}`)
        // console.log(`ClipPosition: ${vecToString(position_c)}`)
        return position_c
    }

    public getMouseWorldPosition(ev: MouseEvent): vec3{
        let position_c = this.getMouseClipPosition(ev)
        let position_w = vec3.transformMat4(vec3.create(), position_c, this.getCamera().clip_to_world)
        // console.log(`WorldPosition: ${vecToString(position_w)}`)
        return position_w
    }

    public getMouseVoxelPosition(ev: MouseEvent): vec3{
        const world_to_voxel = mat4.invert(mat4.create(), this.viewport_driver.getVoxelToWorldMatrix())
        let position_w = this.getMouseWorldPosition(ev)
        let position_vx = vec3.transformMat4(vec3.create(), position_w, world_to_voxel)
        // console.log(`VoxelPosition: ${vecToString(position_vx)} ======================`)
        return position_vx
    }

    public render = (brushStrokes: Array<BrushStroke>, renderer: BrushRenderer) => {
        const viewport_geometry = this.viewport_driver.getGeometry()
        coverContents({
            target: this.canvas,
            overlay: this.element,
            offsetLeft: viewport_geometry.left,
            offsetBottom: viewport_geometry.bottom,
            height: viewport_geometry.height,
            width: viewport_geometry.width,
        })
        this.gl.viewport(
            viewport_geometry.left,
            viewport_geometry.bottom,
            viewport_geometry.width,
            viewport_geometry.height
        ); //FIXME: shuold aspect play a role here?

        renderer.render({
            brush_strokes: brushStrokes,
            camera: this.getCamera(),
            voxelToWorld: this.viewport_driver.getVoxelToWorldMatrix(),
            renderParams: new RenderParams({
                scissorConfig: new ScissorConfig({
                    x: viewport_geometry.left,
                    y: viewport_geometry.bottom,
                    height: viewport_geometry.height,
                    width: viewport_geometry.width,
                }),
                clearConfig: new ClearConfig({
                    a: 0.0,
                }),
            })
        })
    }

    public destroy(){
        this.element.parentNode!.removeChild(this.element)
    }
}

export class BrushingOverlay{
    public readonly element: HTMLCanvasElement
    public readonly gl: WebGL2RenderingContext
    public readonly viewer_driver

    private readonly brush_stroke_handler: IBrushStrokeHandler
    private viewports: Array<OverlayViewport>

    public constructor({
        viewer_driver,
        brush_stroke_handler,
    }: {
        viewer_driver: IViewerDriver,
        brush_stroke_handler: IBrushStrokeHandler,
    }){
        this.viewer_driver = viewer_driver
        this.brush_stroke_handler = brush_stroke_handler
        this.element = createElement({tagName: "canvas", parentElement: document.body}) as HTMLCanvasElement;
        this.gl = this.element.getContext("webgl2", {depth: true, stencil: true})!
        this.viewports = this.viewer_driver.getViewportDrivers().map((viewport_driver) => {
            return new OverlayViewport({brush_stroke_handler: this.brush_stroke_handler, viewport_driver, gl: this.gl})
        })
        if(viewer_driver.onViewportsChanged){
            viewer_driver.onViewportsChanged((new_viewport_drivers) => {
                this.viewports.forEach((viewport) => {
                    viewport.destroy()
                })
                this.viewports = new_viewport_drivers.map((viewport_driver) => {
                    return new OverlayViewport({brush_stroke_handler: this.brush_stroke_handler, viewport_driver, gl: this.gl})
                })
            })
        }
    }

    public setBrushingEnabled(enabled: boolean){
        this.viewports.forEach(viewport => viewport.setBrushingEnabled(enabled))
    }

    public render = (brushStrokes: Array<BrushStroke>, renderer: BrushRenderer) => {
        const trackedElement = this.viewer_driver.getTrackedElement()
        coverContents({target: trackedElement, overlay: this.element})
        this.element.width = this.element.scrollWidth
        this.element.height = this.element.scrollHeight
        this.viewports.forEach((viewport) => {
            viewport.render(brushStrokes, renderer)
        })
    }
}
