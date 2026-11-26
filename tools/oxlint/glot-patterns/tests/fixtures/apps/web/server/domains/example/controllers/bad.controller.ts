const helper = () => 'helper'

type ExampleInput = { id: string }

function localFunction() {
  return helper()
}

export default class ExampleController {
  show() {
    return localFunction()
  }
}
