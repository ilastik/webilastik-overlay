import { Applet } from "../client/applets/applet";
import { FeatureExtractor, Session } from "../client/ilastik";
import { IViewerDriver } from "../drivers/viewer_driver";
import { createElement, removeElement } from "../util/misc";
import { PredictingWidget } from "./widgets/predicting_widget";
import { BrushingWidget } from "./widgets/brushing_overlay/brushing_widget";
import { FeatureSelectionWidget } from "./widgets/feature_selection";

export class ReferencePixelClassificationWorkflowGui{
    public readonly element: HTMLElement
    public readonly feature_selection_applet: Applet<FeatureExtractor[]>
    public readonly brushing_applet: BrushingWidget;
    public readonly live_updater: PredictingWidget;
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
        this.live_updater = new PredictingWidget({
            session,
            viewer_driver
        })
    }

    public destroy(){
        //FIXME: close predictions and stuff
        this.brushing_applet.destroy()
        removeElement(this.element)
    }
}
