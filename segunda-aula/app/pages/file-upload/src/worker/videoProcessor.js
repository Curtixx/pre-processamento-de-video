export default class VideoProcessor {
    #mp4Demuxer
    #webMWriter
    #service
    #buffers = []
    /**
     * 
     * @param {object} options
     * @param {import('./mp4Demuxer.js').default} options.mp4Demuxer
     * @param {import('./../deps/webm-writer2.js').default} options.webMWriter
     * @param {import('./service.js').default} options.service
     */
    constructor({ mp4Demuxer, webMWriter, service }) {
        this.#mp4Demuxer = mp4Demuxer
        this.#webMWriter = webMWriter
        this.#service = service
    }

    async start ({ file, encoderConfig, renderFrame, sendMessage }) {
        const stream = file.stream()
        const fileName = file.name.split('/').pop().replace('.mp4', '')
        await this.mp4Decoder(stream)
            .pipeThrough(this.enconde144p(encoderConfig))
            .pipeThrough(this.renderDecodedFramesAndGetEncodedChunks(renderFrame))
            .pipeThrough(this.transformInToWebM())
            //CASO QUEIRA FAZER DOWNLOAD LOCAL E SO DESCOMENTAR
            // .pipeThrough(new TransformStream({
            //     transform: ({ data, position }, controller) => {
            //         this.#buffers.push(data)
            //         controller.enqueue(data)
            //     },
            //     flush: () => {
            //         //PARA FAZER DOWNLOAD
            //         // sendMessage({
            //         //     status: 'done',
            //         //     buffers: this.#buffers,
            //         //     filename: fileName.concat('-144.webm')
            //         // })
            //         sendMessage({
            //             status: 'done'
            //         })
            //     }
            // }))
            .pipeTo(this.upload(fileName, '144p', 'webm'))

        sendMessage({
            status: 'done'
        })

    }

    upload(filename, resolution, type) {
        const chunks = []
        let byteCount = 0
        let segmentCount = 0
        const triggerUpload = async chunks => {
            const blob = new Blob(chunks, {type: 'video/webm'})

            //FAZER UPLOAD
            await this.#service.uploadFile({
                filename: `${filename}-${resolution}.${++segmentCount}.${type}`,
                fileBuffer: blob
            })
            //REMOVER TODOS OS ELEMENTOS
            chunks.length = 0
            byteCount = 0
        }
        return new WritableStream({
            /**
             * 
             * @param {object} options 
             * @param {Uint8Array} options.data
             */
            async write({ data }) {
                chunks.push(data)
                byteCount += data.byteLength

                //NÃO FAZ UPLOAD SE FOR MENOR DE 10 MEGABYTES
                if(byteCount <= 10e6) return
                await triggerUpload(chunks)
                //renderFrame(frame)
            },
            async close() {
                //ANTES DE ENCERRAR VALIDA SE TEM DADOS SE NAO TIVER ACABA SE TIVER ELE DISPARA
                if(!chunks.length) return
                await triggerUpload(chunks)
            }
        })
    }

    renderDecodedFramesAndGetEncodedChunks(renderFrame) {
        let _decoder
        return new TransformStream({
            start: (controller) => {
                _decoder = new VideoDecoder({
                    output(frame){
                        renderFrame(frame)
                    },
                    error(e){
                        console.log('erro na renderização de frames', e);
                        controller.error(e)
                    }
                })
            },
            /**
             * 
             * @param {EncodedVideoChunk} encodedChunk 
             * @param {TransformStreamDefaultController} controller 
             */
            async transform(encodedChunk, controller){
                if(encodedChunk.type === 'config') {
                    await _decoder.configure(encodedChunk.config)
                    return
                }
                _decoder.decode(encodedChunk)

                //PARA TRANSFORMAR EM WEBM OBRIGATORIAMENTE PRECISAMOS CONVERTER
                controller.enqueue(encodedChunk)

            }
        })
    }

    transformInToWebM() {
        const writable = new WritableStream({
            write:(chunk) => {
                this.#webMWriter.addFrame(chunk)
            },
            close(){
                debugger
            }
        })
        return {
            readable: this.#webMWriter.getStream(),
            writable
        }
    }

    enconde144p(encoderConfig) {
        let _encoder
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
                    /**
                     * 
                     * @param {EncodedVideoChunk} frame 
                     * @param {EncodedVideoChunkMetadata} config 
                     */
                    output: (frame, config) => {
                        if(config.decoderConfig){
                            const decoderConfig = {
                                type : 'config',
                                config: config.decoderConfig
                            }
                            controller.enqueue(decoderConfig)
                        }
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
    mp4Decoder(stream) {
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
                        decoder.configure(config)
                    },
                    /**
                     * 
                     * @param {EncodedVideoChunk} chunk 
                     */
                    onChunk(chunk){
                        decoder.decode(chunk)
                    }
                })
            }
            
        })
    }
}