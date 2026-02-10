import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import {asyncHandler} from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler( async (req,res) => {
    // get details from the user
    // validation not empty
    // check if already exists - email username
    // check for images (avatars)
    // upload them in cloudinary, check for avatar
    // create user object in db
    // remove password and refresh token
    // check for user creation (hua ki nhi)
    // return res




    const {fullName, email, userName, password} = req.body


    if (
        [fullName,email,userName,password]
        .some((field) => field?.trim() === "")
    ) {
     throw new ApiError(400, "All feilds are required")
    }

    const existedUser = await User.findOne({
        $or: [{email}, {userName}]
    })

    if (existedUser) {
        throw new ApiError (400, "username or email already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: userName.toLowerCase()
    })

    const createdUser = await User.findById(user._id)
    .select("-password -refreshToken");

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "user registered succesfully")
    )

})

export {registerUser}