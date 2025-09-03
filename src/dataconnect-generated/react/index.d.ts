import { CreateListData, CreateListVariables, GetMyListsData, AddMovieToListData, AddMovieToListVariables, CreateReviewData, CreateReviewVariables } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useCreateList(options?: useDataConnectMutationOptions<CreateListData, FirebaseError, CreateListVariables>): UseDataConnectMutationResult<CreateListData, CreateListVariables>;
export function useCreateList(dc: DataConnect, options?: useDataConnectMutationOptions<CreateListData, FirebaseError, CreateListVariables>): UseDataConnectMutationResult<CreateListData, CreateListVariables>;

export function useGetMyLists(options?: useDataConnectQueryOptions<GetMyListsData>): UseDataConnectQueryResult<GetMyListsData, undefined>;
export function useGetMyLists(dc: DataConnect, options?: useDataConnectQueryOptions<GetMyListsData>): UseDataConnectQueryResult<GetMyListsData, undefined>;

export function useAddMovieToList(options?: useDataConnectMutationOptions<AddMovieToListData, FirebaseError, AddMovieToListVariables>): UseDataConnectMutationResult<AddMovieToListData, AddMovieToListVariables>;
export function useAddMovieToList(dc: DataConnect, options?: useDataConnectMutationOptions<AddMovieToListData, FirebaseError, AddMovieToListVariables>): UseDataConnectMutationResult<AddMovieToListData, AddMovieToListVariables>;

export function useCreateReview(options?: useDataConnectMutationOptions<CreateReviewData, FirebaseError, CreateReviewVariables>): UseDataConnectMutationResult<CreateReviewData, CreateReviewVariables>;
export function useCreateReview(dc: DataConnect, options?: useDataConnectMutationOptions<CreateReviewData, FirebaseError, CreateReviewVariables>): UseDataConnectMutationResult<CreateReviewData, CreateReviewVariables>;
