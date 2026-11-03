import { ReactiveController, ReactiveControllerHost } from 'lit';
import {
  InfiniteQueryObserver,
  InfiniteQueryObserverResult,
  QueryClient,
  InfiniteQueryObserverOptions,
  InfiniteData,
  QueryKey,
} from '@tanstack/query-core';

export class InfiniteQueryController<
  TQueryFnData = unknown,
  TError = unknown,
  TData = InfiniteData<TQueryFnData>,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown
> implements ReactiveController
{
  private host: ReactiveControllerHost;
  private client: QueryClient;
  private observer: InfiniteQueryObserver<
    TQueryFnData,
    TError,
    TData,
    TQueryKey,
    TPageParam
  >;
  private result: InfiniteQueryObserverResult<TData, TError>;
  private unsubscribe?: () => void;

  private _options: InfiniteQueryObserverOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>;
  private _optionsFn?: () => InfiniteQueryObserverOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>;

  constructor(
    host: ReactiveControllerHost,
    client: QueryClient,
    options: InfiniteQueryObserverOptions<
      TQueryFnData,
      TError,
      TData,
      TQueryKey,
      TPageParam
    > | (() => InfiniteQueryObserverOptions<
      TQueryFnData,
      TError,
      TData,
      TQueryKey,
      TPageParam
    >)
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

    this.observer = new InfiniteQueryObserver(client, this._options);
    const defaultedOptions = this.client.defaultQueryOptions(this._options);
    this.result = this.observer.getOptimisticResult(defaultedOptions as any);
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

  updateOptions(
    options: InfiniteQueryObserverOptions<
      TQueryFnData,
      TError,
      TData,
      TQueryKey,
      TPageParam
    >
  ) {
    this.observer.setOptions(options);
    const defaultedOptions = this.client.defaultQueryOptions(options);
    this.result = this.observer.getOptimisticResult(defaultedOptions as any);
    this.host.requestUpdate();
  }

  fetchNextPage() {
    return this.observer.fetchNextPage();
  }

  fetchPreviousPage() {
    return this.observer.fetchPreviousPage();
  }

  refetch() {
    return this.observer.refetch();
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

  get isError() {
    return this.result.isError;
  }

  get isSuccess() {
    return this.result.isSuccess;
  }

  get status() {
    return this.result.status;
  }

  get isFetching() {
    return this.result.isFetching;
  }

  get isFetchingNextPage() {
    return this.result.isFetchingNextPage;
  }

  get isFetchingPreviousPage() {
    return this.result.isFetchingPreviousPage;
  }

  get hasNextPage() {
    return this.result.hasNextPage;
  }

  get hasPreviousPage() {
    return this.result.hasPreviousPage;
  }
}
