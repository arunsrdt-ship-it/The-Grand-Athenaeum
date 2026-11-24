import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

let ownerTokenForRequest = '';

export function setLibraryOwnerToken(token) {
  ownerTokenForRequest = token;
}

export function getLibraryOwnerToken() {
  return ownerTokenForRequest;
}

export const libraryApi = createApi({
  reducerPath: 'libraryApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/',
    credentials: 'include',
    prepareHeaders(headers, { endpoint }) {
      if (endpoint === 'uploadBook' && ownerTokenForRequest) {
        headers.set('X-Admin-Token', ownerTokenForRequest);
      }
      if (endpoint === 'saveReaderBookmark' && ownerTokenForRequest) {
        headers.set('X-Admin-Token', ownerTokenForRequest);
      }
      return headers;
    },
  }),
  tagTypes: ['Book', 'Reader', 'ReaderBookmarks'],
  endpoints: (build) => ({
    getBooks: build.query({
      query: (accessKey = 'public') => ({
        url: 'books',
        headers: typeof accessKey === 'string' && accessKey.startsWith('owner-') && ownerTokenForRequest
          ? { 'X-Admin-Token': ownerTokenForRequest }
          : undefined,
      }),
      transformResponse: (response) => response.books ?? [],
      providesTags: (books) => [
        { type: 'Book', id: 'LIST' },
        ...(books ?? []).map(({ id }) => ({ type: 'Book', id })),
      ],
    }),
    uploadBook: build.mutation({
      query: ({ file, title, author, category, year, shelfSlot, visibility }) => {
        const body = new FormData();
        body.append('pdf', file);
        body.append('title', title);
        body.append('author', author);
        body.append('category', category);
        body.append('year', year);
        body.append('shelfSlot', String(shelfSlot));
        body.append('visibility', visibility);

        return {
          url: 'books',
          method: 'POST',
          body,
        };
      },
      invalidatesTags: [{ type: 'Book', id: 'LIST' }],
    }),
    getCurrentReader: build.query({
      query: () => 'auth/me',
      transformResponse: (response) => response.user ?? null,
      providesTags: ['Reader'],
    }),
    registerReader: build.mutation({
      query: ({ email, password }) => ({ url: 'auth/register', method: 'POST', headers: { 'X-Requested-With': 'XMLHttpRequest' }, body: { email, password } }),
      invalidatesTags: ['Reader', 'ReaderBookmarks'],
    }),
    loginReader: build.mutation({
      query: ({ email, password }) => ({ url: 'auth/login', method: 'POST', headers: { 'X-Requested-With': 'XMLHttpRequest' }, body: { email, password } }),
      invalidatesTags: ['Reader', 'ReaderBookmarks'],
    }),
    logoutReader: build.mutation({
      query: () => ({ url: 'auth/logout', method: 'POST', headers: { 'X-Requested-With': 'XMLHttpRequest' } }),
      invalidatesTags: ['Reader', 'ReaderBookmarks'],
    }),
    getReaderBookmarks: build.query({
      query: () => 'me/bookmarks',
      transformResponse: (response) => response.bookmarks ?? [],
      providesTags: ['ReaderBookmarks'],
    }),
    saveReaderBookmark: build.mutation({
      query: (bookKey) => ({ url: `me/bookmarks/${encodeURIComponent(bookKey)}`, method: 'PUT', headers: { 'X-Requested-With': 'XMLHttpRequest' } }),
      invalidatesTags: ['ReaderBookmarks'],
    }),
    removeReaderBookmark: build.mutation({
      query: (bookKey) => ({ url: `me/bookmarks/${encodeURIComponent(bookKey)}`, method: 'DELETE', headers: { 'X-Requested-With': 'XMLHttpRequest' } }),
      invalidatesTags: ['ReaderBookmarks'],
    }),
  }),
});

export const {
  useGetBooksQuery,
  useUploadBookMutation,
  useGetCurrentReaderQuery,
  useRegisterReaderMutation,
  useLoginReaderMutation,
  useLogoutReaderMutation,
  useGetReaderBookmarksQuery,
  useSaveReaderBookmarkMutation,
  useRemoveReaderBookmarkMutation,
} = libraryApi;
