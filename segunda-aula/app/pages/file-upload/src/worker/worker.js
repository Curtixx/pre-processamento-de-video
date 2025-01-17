import VideoProcessor from "./videoProcessor.js"
import Mp4FDemuxer from "./mp4Demuxer.js"
import CanvasRederer from "./canvasRenderer.js"
import WebMWriter from './../deps/webm-writer2.js'
import Service from "./service.js"

const qvgaConstraints = {
    width: 320,
    height: 240
}

const vgaContraints = {
    width: 640,
    height: 480
}

const hdContraints = {
    width: 1280,
    height: 720
}

const encoderConfig = {
    //PARA WebM
    ...qvgaConstraints,
    bitrate: 10e6,
    codec: 'vp09.00.10.08',
    pt: 4,
    hardwareAcceleration: 'prefer-software',

    //PARA MP4
    // codec: 'avc1.42002A',
    // pt: 1,
    // hardwareAcceleration: 'prefer-hardware',
    // avc: {
    //     format: 'annexb'
    // }
}

const webMWriterConfig = {
    codec: 'VP9',
    width: encoderConfig.width,
    height: encoderConfig.height,
    bitrate: encoderConfig.bitrate,
}

const mp4Demuxer = new Mp4FDemuxer()
const service = new Service({
    url: 'http://localhost:3000'
})
const videoProcessor = new VideoProcessor({
    mp4Demuxer,
    webMWriter: new WebMWriter(webMWriterConfig),
    service,
})
CanvasRederer

onmessage = async ({ data }) => {
    const renderFrame = CanvasRederer.getRenderer(data.canvas)
    await videoProcessor.start({
        file: data.file,
        renderFrame,
        encoderConfig,
        sendMessage: (message) => {
            self.postMessage(message)
        }
    })
    // self.postMessage({
    //     status: 'done'
    // })

}