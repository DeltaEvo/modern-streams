const { promises: fs } = require('fs')

const delay = time => new Promise(resolve => setTimeout(resolve, time))

async function *read() {
    yield "Hello";
    await delay(1000) 
    yield "World";
    await delay(1000);
    yield "Unicorn";
}

async function *openFile(path, { flags = 'r', mode = 0o666,  highWaterMark = 64 * 1024 } = {}) {
    let handle;
    let read;
    try {
        handle = await fs.open(path, flags, mode)
        const buf = Buffer.allocUnsafe(highWaterMark)
        while ((read = (await handle.read(buf, 0, highWaterMark)).bytesRead) > 0)
            yield buf.slice(0, read)
    } finally {
        handle && await handle.close()
    }
}


async function *transform(input) {
    for await (const data of input) {
        console.log('DATA@', data)
        yield data.toString().toUpperCase()
    }
}


async function write(input) {
    for await (const data of input) {
        //console.log(data.length)
        process.stdout.write(data)
    }
}

void async function () {
/*    await (
        read() |> transform |> write
    )
    console.log("End")

    await do {
        read() |> transform |> write
    }
    console.log("End2") */


    await do {
        openFile('package.json') |> transform |> write
    }
    console.log('END')
}()
