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

    async start ({ file, encoderConfig, renderFrame }) {
        const stream = file.stream()
        const fileName = file.name.split('/').pop().replace('.mp4', '')
        await this.mp4Decoder(stream)
            .pipeThrough(this.enconde144p(encoderConfig))
            .pipeTo(new WritableStream({
                write(frame) {
                    //renderFrame(frame)
                }
            }))

    }

    enconde144p(encoderConfig) {
        let _encoder;
        const readable = new ReadableStream({
            start: async(controller) => {
                const { supported } = await VideoEncoder.isConfigSupported(encoderConfig)
                if(!supported){
                    const errorMsg = 'encode144p VideoEncoder configuração não suportada!'
                    console.error(errorMsg, config);
                    controller.error(errorMsg)
                    return
                }
                _encoder = new VideoEncoder({
                    output: (frame, config) => {
                        debugger
                        controller.enqueue(frame)
                    },
                    error: (err) => {
                        console.error('VideoEncoder 144p', err);
                        controller.error(err)
                    }
                })
                
                await _encoder.configure(encoderConfig)
            }
        })
        const writable = new WritableStream({
            async write(frame) {
                _encoder.encode(frame)
                frame.close()
            }
        })

        return {
            readable, writable
        }

    }

    /**
     * 
     * @returns {ReadableStream}
     */
    mp4Decoder(encoderConfig, stream) {
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
                    async onConfig(config) {
                        const { supported } = await VideoDecoder.isConfigSupported(config)
                        if(!supported){
                            console.error('mp4Muxer VideoDecoder configuração não suportada!', config);
                            controller.close()
                            return
                        } 
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