import Clock from './deps/clock.js';
import View from './view.js';

const view = new View()
const clock = new Clock()
const worker = new Worker('./src/worker/worker.js', {
    type: 'module'
})
let took = ''

worker.onerror = (err) => {
    console.error('erro no worker', err);
}
worker.onmessage = ({ data }) => {
    if(data.status !== 'done') return
    clock.stop()
    view.updateElapsedTime(`Process took ${took.replace('ago', '')}`)
}

view.configureOnFileChange(file => {
    const canvas = view.getCanvas()
    worker.postMessage({
        file,
        canvas
    }, [
        canvas
    ])

    clock.start((time) => {
        took = time;
         view.updateElapsedTime(`Process started ${time}`)
    })

})

//FUNÇÃO PARA SIMULAR O PROCESSO DE SELECIONAR UM VIDEO
async function fakeFetch() {
    const filePath = '/videos/frag_bunny.mp4'

    const res = await fetch(filePath)
    // TRAZ O TAMANHO DO ARQUIVO
    // const res = await fetch(filePath, {
    //     method: 'HEAD'
    // })
    // res.headers.get('content-length')

    const file = new File([await res.blob()], filePath, {
        type: 'video/mp4',
        lastModified: Date.now()
    })

    const event = new Event('change')
    Reflect.defineProperty(
        event,
        'target',
        {value: {files: [file]}}
    )

    document.getElementById('fileUpload').dispatchEvent(event)
}
fakeFetch()

