import { ReactiveController, ReactiveControllerHost } from 'lit';
import { QueryObserver, QueryObserverResult, QueryClient, QueryObserverOptions } from '@tanstack/query-core';

export class QueryController<TData = unknown, TError = unknown> implements ReactiveController {
  private host: ReactiveControllerHost;
  private client: QueryClient;
  private observer: QueryObserver<TData, TError>;
  private result: QueryObserverResult<TData, TError>;
  private unsubscribe?: () => void;
  private _options: QueryObserverOptions<TData, TError>;
  private _optionsFn?: () => QueryObserverOptions<TData, TError>;

  constructor(
    host: ReactiveControllerHost,
    client: QueryClient,
    options: QueryObserverOptions<TData, TError> | (() => QueryObserverOptions<TData, TError>)
  ) {
    this.host = host;
    this.client = client;
    this.host.addController(this);
    
    if (typeof options === 'function') {
      this._optionsFn = options;
      this._options = options();
    } else {
      this._options = options;
    }

    this.observer = new QueryObserver(client, this._options);
    const defaultedOptions = this.client.defaultQueryOptions(this._options);
    this.result = this.observer.getOptimisticResult(defaultedOptions);
  }

  hostConnected() {
    this.unsubscribe = this.observer.subscribe((result) => {
      this.result = result;
      this.host.requestUpdate();
    });
  }

  hostUpdate() {
    if (this._optionsFn) {
      const newOptions = this._optionsFn();
      this.observer.setOptions(newOptions);
      this._options = newOptions;
    }
  }

  hostDisconnected() {
    this.unsubscribe?.();
  }

  updateOptions(options: QueryObserverOptions<TData, TError>) {
    this._options = options;
    this.observer.setOptions(options);
    const defaultedOptions = this.client.defaultQueryOptions(options);
    this.result = this.observer.getOptimisticResult(defaultedOptions);
    this.host.requestUpdate();
  }

  get options() {
    return this._options;
  }

  get data() {
    return this.result.data;
  }

  get dataUpdatedAt() {
    return this.result.dataUpdatedAt;
  }

  get error() {
    return this.result.error;
  }

  get isLoading() {
    return this.result.isLoading;
  }

  get isFetching() {
    return this.result.isFetching;
  }

  get isSuccess() {
    return this.result.isSuccess;
  }

  get status() {
    return this.result.status;
  }
}