import VideoProcessor from "./videoProcessor.js"
import Mp4FDemuxer from "./mp4Demuxer.js"
import CanvasRederer from "./canvasRenderer.js"

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
    // coded: 'avc1.42002A',
    // pt: 1,
    // hardwareAcceleration: 'prefer-hardware',
    // avc: {
    //     format: 'annexb'
    // }
}

const mp4Demuxer = new Mp4FDemuxer()
const videoProcessor = new VideoProcessor({
    mp4Demuxer
})
CanvasRederer

onmessage = async ({ data }) => {
    const renderFrame = CanvasRederer.getRenderer(data.canvas)
    await videoProcessor.start({
        file: data.file,
        renderFrame,
        encoderConfig,
        sendMessage(message) {
            self.postMessage(message)
        }
    })
    self.postMessage({
        status: 'done'
    })

}