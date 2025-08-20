import axiosInstance from "../config/axios";

const technicalApi ={
    getRatings: (data) => axiosInstance.get(`get_analysis`)
}

export default technicalApi