import axiosInstance from "../config/axios";

const technicalApi ={
    getRatings: (data) => axiosInstance.get(`ratings/tv/?symbols_csv=${data}`)
}

export default technicalApi