import { vec4 } from "gl-matrix"

export type BinaryArray = ArrayBufferView & {length: number}

export enum AttributeElementType{
    BYTE = WebGL2RenderingContext.BYTE,
    SHORT = WebGL2RenderingContext.SHORT,
    UNSIGNED_BYTE = WebGL2RenderingContext.UNSIGNED_BYTE,
    UNSIGNED_SHORT = WebGL2RenderingContext.UNSIGNED_SHORT,
    FLOAT = WebGL2RenderingContext.FLOAT,
}

// determines if each atribute value in the buffer is a single, vec2, vec3 or vec4
export type AttributeNumComponents = 1 | 2 | 3 | 4

export enum StencilOp{
    KEEP = WebGL2RenderingContext.KEEP,
    ZERO = WebGL2RenderingContext.ZERO,
    REPLACE = WebGL2RenderingContext.REPLACE,
    INCR = WebGL2RenderingContext.INCR,
    INCR_WRAP = WebGL2RenderingContext.INCR_WRAP,
    DECR = WebGL2RenderingContext.DECR,
    DECR_WRAP = WebGL2RenderingContext.DECR_WRAP,
    INVERT = WebGL2RenderingContext.INVERT,
}

export enum StencilFunc{
    NEVER = WebGL2RenderingContext.NEVER,
    LESS = WebGL2RenderingContext.LESS,
    EQUAL = WebGL2RenderingContext.EQUAL,
    LEQUAL = WebGL2RenderingContext.LEQUAL,
    GREATER = WebGL2RenderingContext.GREATER,
    NOTEQUAL = WebGL2RenderingContext.NOTEQUAL,
    GEQUAL = WebGL2RenderingContext.GEQUAL,
    ALWAYS = WebGL2RenderingContext.ALWAYS,
}

export enum CullFace{
    BACK = WebGL2RenderingContext.BACK,
    FRONT = WebGL2RenderingContext.FRONT,
    FRONT_AND_BACK = WebGL2RenderingContext.FRONT_AND_BACK,
}

export enum FrontFace{
    CW = WebGL2RenderingContext.CW,
    CCW = WebGL2RenderingContext.CCW,
}

export enum BlendFactor{
    ZERO = WebGL2RenderingContext.ZERO,
    ONE = WebGL2RenderingContext.ONE,
    SRC_COLOR = WebGL2RenderingContext.SRC_COLOR,
    ONE_MINUS_SRC_COLOR = WebGL2RenderingContext.ONE_MINUS_SRC_COLOR,
    DST_COLOR = WebGL2RenderingContext.DST_COLOR,
    ONE_MINUS_DST_COLOR = WebGL2RenderingContext.ONE_MINUS_DST_COLOR,
    SRC_ALPHA = WebGL2RenderingContext.SRC_ALPHA,
    ONE_MINUS_SRC_ALPHA = WebGL2RenderingContext.ONE_MINUS_SRC_ALPHA,
    DST_ALPHA = WebGL2RenderingContext.DST_ALPHA,
    ONE_MINUS_DST_ALPHA = WebGL2RenderingContext.ONE_MINUS_DST_ALPHA,
    CONSTANT_COLOR = WebGL2RenderingContext.CONSTANT_COLOR,
    ONE_MINUS_CONSTANT_COLOR = WebGL2RenderingContext.ONE_MINUS_CONSTANT_COLOR,
    CONSTANT_ALPHA = WebGL2RenderingContext.CONSTANT_ALPHA,
    ONE_MINUS_CONSTANT_ALPHA = WebGL2RenderingContext.ONE_MINUS_CONSTANT_ALPHA,
    SRC_ALPHA_SATURATE = WebGL2RenderingContext.SRC_ALPHA_SATURATE,
}

export enum DepthFunc{
    NEVER = WebGL2RenderingContext.NEVER,
    LESS = WebGL2RenderingContext.LESS,
    EQUAL = WebGL2RenderingContext.EQUAL,
    LEQUAL = WebGL2RenderingContext.LEQUAL,
    GREATER = WebGL2RenderingContext.GREATER,
    NOTEQUAL = WebGL2RenderingContext.NOTEQUAL,
    GEQUAL = WebGL2RenderingContext.GEQUAL,
    ALWAYS = WebGL2RenderingContext.ALWAYS,
}

export class CullConfig{
    public readonly face: CullFace
    public readonly frontFace: FrontFace
    public readonly enable: boolean

    constructor({face=CullFace.BACK, frontFace=FrontFace.CCW, enable=true}: {
        face?: CullFace,
        frontFace?: FrontFace,
        enable?: boolean
    }){
        this.face = face; this.frontFace = frontFace, this.enable = enable
    }

    public use(gl: WebGL2RenderingContext){
        if(this.enable){
            gl.enable(gl.CULL_FACE)
            gl.frontFace(this.frontFace)
            gl.cullFace(this.face)
        }else{
            gl.disable(gl.CULL_FACE)
        }
    }
}

export class ColorMask{
    public r: boolean;
    public g: boolean;
    public b: boolean;
    public a: boolean;

    constructor({r=true, g=true, b=true, a=true}: {r?: boolean, g?: boolean, b?: boolean, a?: boolean}){
        this.r = r; this.g = g; this.b=b; this.a = a
    }

    public use(gl: WebGL2RenderingContext){
        gl.colorMask(this.r, this.g, this.b, this.a)
    }
}

export class StencilConfig{
    public func: StencilFunc
    public ref: number
    public mask: number

    public fail: StencilOp
    public zfail: StencilOp
    public zpass: StencilOp

     //default stencil op to not touch the stencil
    constructor({func=StencilFunc.ALWAYS, ref=1, mask=0xFFFFFFFF, fail=StencilOp.KEEP, zfail=StencilOp.KEEP, zpass=StencilOp.KEEP}: {
        func?: StencilFunc
        ref?: number
        mask?: number

        fail?: StencilOp
        zfail?: StencilOp
        zpass?: StencilOp
    }){
        this.func=func; this.ref=ref; this.mask=mask; this.fail=fail; this.zfail=zfail; this.zpass=zpass
    }

    public use(gl: WebGL2RenderingContext){
        gl.stencilFunc(/*func=*/this.func, /*ref=*/this.ref, /*mask=*/this.mask)
        gl.stencilOp(/*fail=*/this.fail, /*zfail=*/this.zfail, /*zpass=*/this.zpass)
    }
}

export class BlendingConfig{
    sfactor: BlendFactor
    dfactor: BlendFactor
    color?: vec4
    enable: boolean

    constructor({sfactor=BlendFactor.SRC_ALPHA, dfactor=BlendFactor.ONE_MINUS_SRC_ALPHA, color, enable=true}:{
        sfactor?: BlendFactor,
        dfactor?: BlendFactor,
        color?: vec4,
        enable?: boolean
    }){
        this.sfactor=sfactor; this.dfactor=dfactor; this.color=color; this.enable=enable
    }

    public use(gl: WebGL2RenderingContext){
        if(this.enable){
            gl.enable(gl.BLEND)
            gl.blendFunc(this.sfactor, this.dfactor)
        }else{
            gl.disable(gl.BLEND)
        }
    }
}

export class DepthConfig{
    mask: boolean
    func: DepthFunc

    constructor({mask=true, func=DepthFunc.LESS} : {mask?: boolean, func?:DepthFunc}){
        this.mask=mask; this.func=func
    }

    public use(gl: WebGL2RenderingContext){
        gl.depthMask(this.mask)
        gl.depthFunc(this.func)
    }
}

export class RenderParams{
    public colorMask: ColorMask
    public depthConfig: DepthConfig
    public stencilConfig: StencilConfig
    public cullConfig: CullConfig
    public blendingConfig: BlendingConfig

    public constructor({
        colorMask=new ColorMask({}),
        depthConfig=new DepthConfig({}),
        stencilConfig=new StencilConfig({}),
        cullConfig=new CullConfig({}),
        blendingConfig=new BlendingConfig({}),
    }: {
        colorMask?: ColorMask,
        depthConfig?: DepthConfig,
        stencilConfig?: StencilConfig,
        cullConfig?: CullConfig,
        blendingConfig?: BlendingConfig,
    }){
        this.colorMask = colorMask
        this.depthConfig = depthConfig
        this.stencilConfig = stencilConfig
        this.cullConfig = cullConfig
        this.blendingConfig = blendingConfig
    }

    public use(gl: WebGL2RenderingContext){
        this.colorMask.use(gl)
        this.depthConfig.use(gl)
        this.stencilConfig.use(gl)
        this.cullConfig.use(gl)
        this.blendingConfig.use(gl)
    }
}