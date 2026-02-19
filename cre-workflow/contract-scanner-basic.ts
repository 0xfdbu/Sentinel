import { HTTPCapability, handler, type Runtime, type HTTPPayload, Runner, decodeJson } from "@chainlink/cre-sdk"

const onHttpTrigger = (runtime: Runtime<any>, payload: HTTPPayload): string => {
  const requestData = decodeJson(payload.input) as any
  
  runtime.log("Received scan request")
  runtime.log("Contract: " + requestData.contractAddress)
  runtime.log("Chain ID: " + requestData.chainId)

  return JSON.stringify({
    status: "success",
    contractAddress: requestData.contractAddress,
    chainId: requestData.chainId,
    message: "Request received"
  })
}

const initWorkflow = (config: any) => {
  const httpCapability = new HTTPCapability()
  return [handler(httpCapability.trigger({}), onHttpTrigger)]
}

export async function main() {
  const runner = await Runner.newRunner<any>()
  await runner.run(initWorkflow)
}
