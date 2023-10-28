export default class VideoProcessor {
    #mp4Demuxer
    /**
     * 
     * @param {object} options
     * @param {import('./mp4Demuxer.js').default} options.mp4Demuxer
     */
    constructor({ mp4Demuxer }) {
        this.#mp4Demuxer = mp4Demuxer
    }

    async start ({ file, enconderConfig, renderFrame }) {
        const stream = file.stream()
        const fileName = file.name.split('/').pop().replace('.mp4', '')
        await this.mp4Decoder(enconderConfig, stream).pipeTo(new WritableStream({
            write(frame) {
                renderFrame(frame)
            }
        }))

    }
    /**
     * 
     * @returns {ReadableStream}
     */
    mp4Decoder(enconderConfig, stream) {

        return new ReadableStream({
            start: async(controller) => {
                const decoder = new VideoDecoder({
                    /**
                     * 
                     * @param {VideoFrame} frame 
                     */
                    output(frame) {
                        controller.enqueue(frame)
                    },
                    error(e) {
                        console.error('erro no mp4Decoder', e);
                        controller.error(e)
                    }
                })
        
                return this.#mp4Demuxer.run(stream, {
                    onConfig(config) {
                        decoder.configure(config)
                    },
                    /**
                     * 
                     * @param {EncodedVideoChunk} chunk 
                     */
                    onChunk(chunk){
                        decoder.decode(chunk)
                    }
                }).then(() => {
                    setTimeout(() => {
                        controller.close()
                    }, 1000)
                })
            }
            
        })
    }
}