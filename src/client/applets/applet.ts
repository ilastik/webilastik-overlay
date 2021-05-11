import { Jsonable, IDeserializer, toJsonValue } from "../../util/serialization";
import { Session } from "../ilastik";

export type StateChangeCallback<STATE extends Jsonable> = (state: STATE) => void;
export interface IAppletWidget<STATE extends Jsonable>{
    displayState: (state: STATE) => void;
}
export interface IWidgetFactory<STATE extends Jsonable>{
    (params: {onNewState: StateChangeCallback<STATE>}): IAppletWidget<STATE>
}

/////////////////////////

export class Applet<STATE extends Jsonable>{
    public readonly name: string
    public readonly socket: WebSocket
    public readonly deserializer: IDeserializer<STATE>
    public readonly widget?: IAppletWidget<STATE>

    private constructor({name, socket, deserializer, widget_factory}: {
        name: string,
        socket: WebSocket,
        deserializer: IDeserializer<STATE>,
        widget_factory?: IWidgetFactory<STATE>,
    }){
        this.name = name
        this.deserializer = deserializer
        //FIXME: handle failing sockets
        this.socket = socket
        this.socket.addEventListener("error", (ev) => {
            console.error(`Socket for ${this.name} broke:`)
            console.error(ev)
        })
        if(widget_factory){
            this.widget = widget_factory({
                onNewState: (state) => this.updateUpstreamState(state)
            })
            this.socket.addEventListener("message", (ev: MessageEvent) => {
                let raw_data = JSON.parse(ev.data)
                let new_state = this.deserializer(raw_data)
                this.widget?.displayState(new_state)
            })
        }
    }

    public static async create<STATE extends Jsonable>({name, session, deserializer, widget_factory}: {
        name: string,
        session: Session,
        deserializer: IDeserializer<STATE>,
        widget_factory?: IWidgetFactory<STATE>,
    }): Promise<Applet<STATE>>{
        let socket = await session.createAppletSocket(name)
        if(socket === undefined){
            throw `Could not create socket for applet "${name}"`
        }
        return new Applet<STATE>({
            name, socket, deserializer, widget_factory
        })
    }

    private updateUpstreamState(new_state: STATE){
        const args = toJsonValue(new_state)
        console.debug(`>>>>>> ${this.name} is updating state to ${JSON.stringify(args, null, 4)}`)
        this.socket.send(JSON.stringify(toJsonValue(new_state)))
    }
}
