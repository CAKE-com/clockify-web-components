import { ReactiveController, ReactiveControllerHost } from 'lit';
import {
  MutationObserver,
  MutationObserverResult,
  QueryClient,
  MutationObserverOptions,
  MutateOptions,
} from '@tanstack/query-core';

export class MutationController<
  TData = unknown,
  TError = unknown,
  TVariables = void,
  TContext = unknown
> implements ReactiveController
{
  private host: ReactiveControllerHost;
  private observer: MutationObserver<TData, TError, TVariables, TContext>;
  private result: MutationObserverResult<TData, TError, TVariables, TContext>;
  private unsubscribe?: () => void;

  constructor(
    host: ReactiveControllerHost,
    client: QueryClient,
    options: MutationObserverOptions<TData, TError, TVariables, TContext>
  ) {
    this.host = host;
    this.host.addController(this);

    this.observer = new MutationObserver(client, options);
    this.result = this.observer.getCurrentResult();
  }

  hostConnected() {
    this.unsubscribe = this.observer.subscribe((result) => {
      this.result = result;
      this.host.requestUpdate();
    });
  }

  hostDisconnected() {
    this.unsubscribe?.();
  }

  mutate(
    variables: TVariables,
    options?: MutateOptions<TData, TError, TVariables, TContext>
  ) {
    return this.observer.mutate(variables, options);
  }

  async mutateAsync(
    variables: TVariables,
    options?: MutateOptions<TData, TError, TVariables, TContext>
  ): Promise<TData> {
    return this.observer.mutate(variables, options);
  }

  reset() {
    this.observer.reset();
  }

  get data() {
    return this.result.data;
  }

  get error() {
    return this.result.error;
  }

  get isIdle() {
    return this.result.isIdle;
  }

  get isPending() {
    return this.result.isPending;
  }

  get isSuccess() {
    return this.result.isSuccess;
  }

  get isError() {
    return this.result.isError;
  }

  get status() {
    return this.result.status;
  }

  get variables() {
    return this.result.variables;
  }
}
