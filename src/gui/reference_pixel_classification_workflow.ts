import { Applet } from "../client/applets/applet";
import { FeatureExtractor, Session } from "../client/ilastik";
import { IViewerDriver } from "../drivers/viewer_driver";
import { createElement } from "../util/misc";
import { BrushingWidget } from "./widgets/brushing_overlay/brushing_widget";
import { FeatureSelectionWidget } from "./widgets/feature_selection";
import { PredictionsExportWidget } from "./widgets/predictions_export";

export class ReferencePixelClassificationWorkflowGui{
    public readonly element: HTMLElement
    public readonly feature_selection_applet: Applet<FeatureExtractor[]>
    public readonly brushing_applet: BrushingWidget;
    session: Session;

    public constructor({parentElement, session, viewer_driver}: {
        parentElement: HTMLElement,
        session: Session,
        viewer_driver: IViewerDriver,
    }){
        this.session = session
        this.element = createElement({tagName: "div", parentElement, cssClasses: ["ReferencePixelClassificationWorkflowGui"]})
        this.feature_selection_applet = new FeatureSelectionWidget({
            name: "feature_selection_applet",
            session,
            parentElement: this.element,
        })
        this.brushing_applet = new BrushingWidget({
            session,
            parentElement: this.element,
            viewer_driver,
        })
    }

    public close(){
        //FIXME: close predictions and stuff
    }
}
