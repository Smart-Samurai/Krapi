import { combineReducers, configureStore } from "@reduxjs/toolkit";

import authReducer from "./authSlice";
import collectionsReducer from "./collectionsSlice";
import documentsReducer from "./documentsSlice";
import emailReducer from "./emailSlice";
import projectsReducer from "./projectsSlice";
import storageReducer from "./storageSlice";
import uiReducer from "./uiSlice";
import usersReducer from "./usersSlice";

const rootReducer = combineReducers({
  auth: authReducer,
  ui: uiReducer,
  projects: projectsReducer,
  collections: collectionsReducer,
  documents: documentsReducer,
  users: usersReducer,
  email: emailReducer,
  storage: storageReducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
        ignoredActionPaths: ["meta.arg", "payload.timestamp"],
        ignoredPaths: ["items.dates"],
      },
    }),
  devTools: process.env.NODE_ENV !== "production",
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
