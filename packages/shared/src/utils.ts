import "reflect-metadata"

export function report(obj: any, header: string = null, separator = '->') {
    const msg: string[] = []
    if (header != null) {
        msg.push(header)
        msg.push(separator)
    }
    msg.push(`${obj}`)
    console.log(msg.join(' '))
}
