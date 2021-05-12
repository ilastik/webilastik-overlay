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

    public constructor({name, session, deserializer}: {
        name: string,
        session: Session,
        deserializer: IDeserializer<STATE>,
    }){
        this.name = name
        this.deserializer = deserializer
        //FIXME: handle failing sockets
        this.socket = session.createAppletSocket(name)
        this.socket.addEventListener("error", (ev) => {
            console.error(`Socket for ${this.name} broke:`)
            console.error(ev)
        })
        this.socket.addEventListener("message", (ev: MessageEvent) => {
            let raw_data = JSON.parse(ev.data)
            let new_state = this.deserializer(raw_data)
            this.onNewState(new_state)
        })
    }

    protected updateUpstreamState(new_state: STATE){
        const args = toJsonValue(new_state)
        console.debug(`>>>>>> ${this.name} is updating state to ${JSON.stringify(args, null, 4)}`)
        this.socket.send(JSON.stringify(toJsonValue(new_state)))
    }

    protected onNewState(_new_state: STATE){
    }
}
