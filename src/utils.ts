
export function report(obj: any, header:string = null, separator='->') {
    const msg: string[] = []
    if(header != null) {
        msg.push(header)
        msg.push(separator)
    }
    msg.push(`${obj}`)
    console.log(msg.join(' '))
}

function isDevToolsOpen() {
    const consoleObj = console;
    const originalConsole = { ...consoleObj }; // Create a copy of the console object

    // Modify a console method to detect changes
    consoleObj.tempMethod = () => {};

    // Check if the modification persists (indicating DevTools is open)
    const isOpen = consoleObj.hasOwnProperty("tempMethod");

    // Restore the original console object
    delete consoleObj.tempMethod;

    return isOpen;
}