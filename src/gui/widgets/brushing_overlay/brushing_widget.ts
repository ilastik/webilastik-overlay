import { quat, vec3 } from "gl-matrix"
import { IViewerDriver, BrushStroke } from "../../.."
import { DataSource, Session } from "../../../client/ilastik"
import { createElement, createInput, removeElement } from "../../../util/misc"
import { PrecomputedChunks, PrecomputedChunksScale, } from "../../../datasource/precomputed_chunks"
import { CollapsableWidget } from "../collapsable_applet_gui"
import { OneShotSelectorWidget, SelectorWidget } from "../selector_widget"
import { Vec3ColorPicker } from "../vec3_color_picker"
import { BrushingOverlay } from "./brushing_overlay"
import { BrushelBoxRenderer } from "./brush_boxes_renderer"
import { BrushelLinesRenderer } from "./brush_lines_renderer"
import { BrushRenderer } from "./brush_renderer"
import { BrushStrokesContainer } from "./brush_strokes_container"
import { ParsedUrl } from "../../../util/parsed_url"

export class BrushingWidget{
    public static training_view_name_prefix = "ilastik training: "

    public readonly gl: WebGL2RenderingContext
    public readonly viewer_driver: IViewerDriver
    public readonly element: HTMLElement
    public readonly canvas: HTMLCanvasElement
    public readonly status_display: HTMLElement

    private brushStrokeContainer: BrushStrokesContainer
    private refreshStart: number = 0
    private readonly controlsContainer: HTMLElement
    private animationRequestId: number = 0
    private trainingWidget: TrainingWidget | undefined = undefined
    session: Session

    constructor({
        session,
        parentElement,
        viewer_driver,
    }: {
        session: Session,
        parentElement: HTMLElement,
        viewer_driver: IViewerDriver,
    }){
        this.session = session
        this.element = new CollapsableWidget({display_name: "Training", parentElement}).element
        this.element.classList.add("ItkBrushingWidget")
        this.canvas =  createElement({tagName: "canvas", parentElement: document.body}) as HTMLCanvasElement;
        this.gl = this.canvas.getContext("webgl2", {depth: true, stencil: true})!
        this.viewer_driver = viewer_driver

        this.status_display = createElement({tagName:"p", parentElement: this.element, cssClasses: ["ItkBrushingWidget_status_display"]})
        this.controlsContainer = createElement({tagName: "p", parentElement: this.element})

        let p = createElement({tagName: "p", parentElement: this.element})
        createElement({tagName: "label", innerHTML: "Brush Strokes:", parentElement: p})
        this.brushStrokeContainer = new BrushStrokesContainer({
            session,
            parentElement: this.element,
            applet_name: "brushing_applet",
            gl: this.gl,
            onBrushColorClicked: (color: vec3) => this.trainingWidget?.colorPicker.setColor(color)
        })

        this.showCanvas(false)
        if(viewer_driver.onViewportsChanged){
            viewer_driver.onViewportsChanged(() => this.handleViewerDataDisplayChange())
        }
        this.handleViewerDataDisplayChange()
    }

    private showCanvas(show: boolean){
        this.canvas.style.display = show ? "block" : "none"
    }

    public showStatus(message: string){
        this.status_display.innerHTML = message
    }

    public clearStatus(){
        this.status_display.innerHTML = ""
    }

    private resetWidgets(){
        this.trainingWidget?.destroy()
        this.controlsContainer.innerHTML = ""
        this.showCanvas(false)
        this.clearStatus()
    }

    private async handleViewerDataDisplayChange(){
        const refreshStart = this.refreshStart = performance.now()
        const handlingIsOutdated = () => refreshStart < this.refreshStart

        this.resetWidgets()

        const data_view = this.viewer_driver.getDataViewOnDisplay()
        if(data_view === undefined){
            return
        }
        let dataProvider: PrecomputedChunks
        try{
            dataProvider = await PrecomputedChunks.create(ParsedUrl.parse(data_view.url))
            if(handlingIsOutdated()){
                return
            }
        }catch(e){
            return this.showStatus(`${e}`)
        }

        if(dataProvider.isStripped()){
            let originalDataProvider = await dataProvider.getUnstripped()
            if(handlingIsOutdated()){
                return
            }
            let scale = originalDataProvider.findScale(dataProvider.scales[0].resolution)!
            return this.startTraining(scale.toDataSource())
        }

        createElement({tagName: "label", innerHTML: "Select a voxel size to annotate on:", parentElement: this.controlsContainer});
        new OneShotSelectorWidget<PrecomputedChunksScale>({
            parentElement: this.controlsContainer,
            options: dataProvider.scales,
            optionRenderer: (scale) => scale.toResolutionDisplayString(),
            onOk: async (scale) => {
                const stripped_precomp_chunks = await scale.toStrippedPrecomputedChunks(this.session) //FIXME: race condition?
                this.viewer_driver.refreshView({
                    name: BrushingWidget.training_view_name_prefix + `${data_view.name} (${scale.toResolutionDisplayString()})`,
                    url: stripped_precomp_chunks.url.getSchemedHref("://"),
                    similar_url_hint: dataProvider.url.getSchemedHref("://"),
                })
            },
        })
    }

    private startTraining(datasource: DataSource){
        this.resetWidgets()
        this.showCanvas(true)

        const resolution = datasource.spatial_resolution
        this.trainingWidget = new TrainingWidget({
            gl: this.gl,
            parentElement: this.controlsContainer,
            onNewBrushStroke: stroke => this.brushStrokeContainer.addBrushStroke(stroke),
            datasource,
            viewerDriver: this.viewer_driver
        })
        this.showStatus(`Now training on ${datasource.url}(${resolution[0]} x ${resolution[1]} x ${resolution[2]} nm)`)
        window.cancelAnimationFrame(this.animationRequestId)
        const render = () => {
            this.trainingWidget?.render(this.brushStrokeContainer.getBrushStrokes())
            this.animationRequestId = window.requestAnimationFrame(render)
        }
        this.animationRequestId = window.requestAnimationFrame(render)
    }

    public destroy(){
        window.cancelAnimationFrame(this.animationRequestId)
        this.trainingWidget?.destroy()
        this.brushStrokeContainer.destroy()
        removeElement(this.element)
        removeElement(this.canvas)
    }
}


export class TrainingWidget{
    public readonly element: HTMLElement
    public readonly overlay: BrushingOverlay
    public staging_brush_stroke: BrushStroke | undefined = undefined
    public readonly rendererSelector: SelectorWidget<BrushRenderer>
    public readonly colorPicker: Vec3ColorPicker

    constructor({gl, parentElement, datasource, viewerDriver, onNewBrushStroke}: {
        gl: WebGL2RenderingContext,
        parentElement: HTMLElement,
        datasource: DataSource,
        viewerDriver: IViewerDriver,
        onNewBrushStroke: (stroke: BrushStroke) => void,
    }){
        this.element = createElement({tagName: "div", parentElement})

        let p: HTMLElement;

        p = createElement({tagName:"p", parentElement: this.element})
        const brushing_enabled_checkbox = createInput({inputType: "checkbox", parentElement: p, onClick: () => {
            this.overlay.setBrushingEnabled(brushing_enabled_checkbox.checked)
        }})
        const enable_brushing_label = createElement({tagName: "label", innerHTML: "Enable Brushing", parentElement: p});
        (enable_brushing_label as HTMLLabelElement).htmlFor = brushing_enabled_checkbox.id = "brushing_enabled_checkbox"

        p = createElement({tagName: "p", parentElement: this.element})
        createElement({tagName: "label", innerHTML: "Brush Color: ", parentElement: p})
        this.colorPicker = new Vec3ColorPicker({parentElement: p})

        p = createElement({tagName: "p", parentElement: this.element, inlineCss: {display: (window as any).ilastik_debug ? "block" : "none"}})
        createElement({tagName: "label", innerHTML: "Rendering style: ", parentElement: p})
        this.rendererSelector = new SelectorWidget<BrushRenderer>({
            parentElement: p,
            options: [
                new BrushelBoxRenderer({gl, highlightCrossSection: false, onlyCrossSection: true}),
                new BrushelLinesRenderer(gl),
                new BrushelBoxRenderer({gl, debugColors: false, highlightCrossSection: false, onlyCrossSection: false}),
                new BrushelBoxRenderer({gl, debugColors: true, highlightCrossSection: true, onlyCrossSection: false}),
            ],
            optionRenderer: (_, index) => ["Boxes - Cross Section", "Lines", "Boxes", "Boxes (debug colors)"][index],
            onSelection: (_) => {},
        })

        this.overlay = new BrushingOverlay({
            gl,
            trackedElement: viewerDriver.getTrackedElement(),
            viewport_drivers: viewerDriver.getViewportDrivers(),
            brush_stroke_handler: {
                handleNewBrushStroke: (params: {start_position_uvw: vec3, camera_orientation_uvw: quat}) => {
                    this.staging_brush_stroke = BrushStroke.create({
                        gl,
                        start_postition_uvw: params.start_position_uvw, //FIXME put scale somewhere
                        color: this.colorPicker.getColor(),
                        annotated_data_source: datasource,
                        camera_orientation: params.camera_orientation_uvw, //FIXME: realy data space? rename param in BrushStroke?
                    })
                    return this.staging_brush_stroke
                },
                handleFinishedBrushStroke: onNewBrushStroke
            },
        })
    }

    public render(brushStrokes: Array<BrushStroke>){
        let strokes = brushStrokes.slice()
        if(this.staging_brush_stroke){
            strokes.push(this.staging_brush_stroke)
        }
        this.overlay.render(strokes, this.rendererSelector.getSelection())
    }

    public destroy(){
        this.overlay.destroy()
        removeElement(this.element)
    }
}
