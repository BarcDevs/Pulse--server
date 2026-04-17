type SuccessType<T> = {
    data: T
}

type ErrorType<T> = {
    error: T
}

export type ResponseType<T> =
    | {
          message: string
      }
    | SuccessType<T>
    | ErrorType<T>
