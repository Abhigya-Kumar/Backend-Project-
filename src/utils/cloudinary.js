import { compare } from "bcrypt";
import {v2 as cloudinary} from "cloudinary"
import fs from "fs"

cloudinary.config({ 
    cloud_name: 'process.env.CLOUDINARY_CLOUD_NAME', 
    api_key: 'process.env.CLOUDINARY_API_KEY', 
    api_secret: 'process.env.CLOUDINARY_API_SECRET' 
});

const uploadOnCloudinary = async (localfilepath) => {
    try {
        if(!localfilepath) return null

        //upload
        const response = await cloudinary.uploader.upload(localfilepath,{
            resource_type: "auto",
        })
        console.log("file uploaded sucessfully on cloudinary", 
            response.url
        );
        return response;
    } catch (error) {
        fs.unlinkSync(localfilepath) // remove local file temp stored
        return null;
    }
}

export {uploadOnCloudinary}