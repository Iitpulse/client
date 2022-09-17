import axios from "axios";

export const API_QUESTIONS = () =>
  axios.create({
    baseURL: `${process.env.REACT_APP_QUESTIONS_API}`,
    headers: {
      "x-access-token": `Bearer ${localStorage.getItem("token")}`,
    },
  });

export const API_USERS = () =>
  axios.create({
    baseURL: `${process.env.REACT_APP_USERS_API}`,
    headers: {
      "x-access-token": `Bearer ${localStorage.getItem("token")}`,
    },
  });

export const API_TESTS = () =>
  axios.create({
    baseURL: `${process.env.REACT_APP_TESTS_API}`,
    headers: {
      "x-access-token": `Bearer ${localStorage.getItem("token")}`,
    },
  });
