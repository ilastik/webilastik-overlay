import { mat4, quat, vec3 } from 'gl-matrix'
import { BrushRenderer } from './brush_renderer'
// import { BrushShaderProgram } from './brush_stroke'
import { OrthoCamera } from './camera'
// import { PerspectiveCamera } from './camera'
import { ClearConfig, RenderParams, ScissorConfig } from '../../../gl/gl'
import { changeOrientationBase, coverContents, createElement, insertAfter, removeElement } from '../../../util/misc'
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

        if((window as any)["ilastik_debug"]){
            let colors = ["red", "green", "blue", "orange", "purple", "lime", "olive", "navy"]
            this.element.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
            this.element.style.filter = "opacity(0.3)"
        }

        this.element.addEventListener("mousedown", (mouseDownEvent: MouseEvent) => {
            let currentBrushStroke = brush_stroke_handler.handleNewBrushStroke({
                start_position_uvw: this.getMouseUvwPosition(mouseDownEvent),
                camera_orientation_uvw: viewport_driver.getCameraPoseInUvwSpace().orientation_uvw, //FIXME: realy data space? rename param in BrushStroke?
                data_url: viewport_driver.data_url,
            })

            let scribbleHandler = (mouseMoveEvent: MouseEvent) => {
                currentBrushStroke.add_voxel(this.getMouseUvwPosition(mouseMoveEvent))
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
        const pose_uvw = this.viewport_driver.getCameraPoseInUvwSpace()
        const uvw_to_world = this.viewport_driver.getUvwToWorldMatrix()
        return {
            position_w: vec3.transformMat4(
                vec3.create(), pose_uvw.position_uvw, uvw_to_world
            ),
            orientation_w: changeOrientationBase(pose_uvw.orientation_uvw, uvw_to_world),
        }
    }

    public getCamera(): OrthoCamera{
        // - left, right, top, bottom, near and far are measured in nm;
        // - pixelsPerVoxel determines the zoom/field of view;
        // - near and far have to be such that a voxel in any orientation would fit between them;
        const pixels_per_nm = this.viewport_driver.getZoomInPixelsPerNm()
        // const voxel_diagonal_length = vec3.length(mat4.getScaling(vec3.create(), this.viewport_driver.getVoxelToWorldMatrix()))
        const viewport_width_in_voxels = this.element.scrollWidth / pixels_per_nm
        const viewport_height_in_voxels = this.element.scrollHeight / pixels_per_nm
        const camera_pose_w = this.getCameraPoseInWorldSpace()
        return new OrthoCamera({
            left: -viewport_width_in_voxels / 2,
            right: viewport_width_in_voxels / 2,
            near: -1,//-voxel_diagonal_length,
            far: 1,//voxel_diagonal_length,
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

    public getMouseUvwPosition(ev: MouseEvent): vec3{
        const world_to_uvw = mat4.invert(mat4.create(), this.viewport_driver.getUvwToWorldMatrix())
        let position_w = this.getMouseWorldPosition(ev)
        let position_uvw = vec3.transformMat4(vec3.create(), position_w, world_to_uvw)
        // console.log(`DataPosition(nm): ${vecToString(position_uvw)} ======================`)
        return position_uvw
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
            voxelToWorld: this.viewport_driver.getUvwToWorldMatrix(),
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
    public readonly viewer_driver: IViewerDriver

    private readonly brush_stroke_handler: IBrushStrokeHandler
    private viewports: Array<OverlayViewport> = []
    private brushing_enabled: boolean = false

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
        if(viewer_driver.onViewportsChanged){
            viewer_driver.onViewportsChanged(() => this.refreshViewports())
        }
        this.refreshViewports()
    }

    private async refreshViewports(){
        this.viewports.forEach((viewport) => {
            viewport.destroy()
        })
        this.viewports = (await this.viewer_driver.getViewportDrivers()).map((viewport_driver) => {
            const viewport = new OverlayViewport({brush_stroke_handler: this.brush_stroke_handler, viewport_driver, gl: this.gl})
            viewport.setBrushingEnabled(this.brushing_enabled)
            return viewport
        })
    }

    public setBrushingEnabled(enabled: boolean){
        this.brushing_enabled = enabled
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

    public destroy(){
        this.viewports.forEach(viewport => viewport.destroy())
        removeElement(this.element)
    }
}
