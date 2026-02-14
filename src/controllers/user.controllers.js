import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import {asyncHandler} from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"


const generateAccessAndRefreshToken = async(userId) => {
    try {
        const user = await User.findById(userId)

        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken

        await user.save({ validateBeforeSave: false })

        return {accessToken,refreshToken}


    } catch (error) {
        throw new ApiError (500, "something went wrong while generating access and refesh token")
    }
}

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


const loginUser = asyncHandler(async (req, res) => {

    // req body se data lenge
    // username and email hai ya nhi
    // find the user
    // password check
    // access and refresh tocken generated
    // send cookies


   const {email, userName, password} = req.body
   
   if(!userName && !email) {
    throw new ApiError(400, "username or email is required")
   }

   const user = await User.findOne({
    $or: [{username: userName}, {email: email}]
   })

   if(!user) {
    throw new ApiError(400, "user doesn't exists")
   }
// console.log("User found:", user);
// console.log("Entered password:", password);
// console.log("Stored password:", user.password);

   const passwordValid = await user.isPasswordCorrect(password)
//    console.log(email)
   if(!passwordValid) {
    throw new ApiError(401, "passwprd invalid")
   }

   const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id)

   const loggedInUser = await User.findById(user._id)
   .select("-password -refreshToken")

   // sending cookies
   const options = {
    httpOnly: true,
    secure: true
   }

   return res
   .status(200)
   .cookie("accessToken", accessToken, options)
   .cookie("refreshToken", refreshToken, options)
   .json(
    new ApiResponse(
        200,
        {
            user: loggedInUser, accessToken, refreshToken
        },
        "User logged in sucessfully"
    )
   )
})

const logoutUser = asyncHandler(async(req,res) => {

    // after auth we have user in req.user._id
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
    httpOnly: true,
    secure: true
   }

   return res
   .status(200)
   .clearCookie("accessToken", options)
   .clearCookie("refreshToken", options)
   .json(new ApiResponse(200, {}, "User logged out sucsessfully"))
} )

const refreshAccessToken = asyncHandler (async (req, res) => {
    const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError (401, "uunathorized request")
    }
    //decoded will have user using id 

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
        
        const user = await User.findById(decodedToken._id)
    
        if(!user){
            throw new ApiError (401, "invalid refresh token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
             throw new ApiError (401, "Refresh token is used or expired")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(200,
                {accessToken, refreshToken: newRefreshToken},
                "Access Token Refreshed"
            )
        )
 }   catch (error) {
    throw new ApiError (401, error?.message || "Invalid Refresh Token")
 }
})

const changeCurrentPassword = asyncHandler (async (req, res) => {
    //get old password after
    const {oldPassword, password} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError (400, "invalid Password")
    }
        
    //save the updated password

    user.password = password;
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse (200, {}, "Password changed Succesfully"))
})

const getCurrentUser = asyncHandler (async (req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.user, // from auth
        "User fetched succesfully"
    ))
})

const updateUserDetails = asyncHandler (async (req, res) => {
    const {userName, email} = req.body

    if (!userName || !email) {
        throw new ApiError (400, "all fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                username: userName,
                email: email
            }
        },
        {new: true}
    ).select ("-password")

    return res
    .status(200)
    .json(new ApiResponse(
        200, user, "user updated successfully"
    ))
})

const updateAvatar = asyncHandler (async (req, res) => {
    //multer -> auth -> here
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar){
        throw new ApiError(400, "error while uploading avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse (200, user, "Avatar updated sucessfully"))
})

const updateCoverImage = asyncHandler (async (req, res) => {
    //multer -> auth -> here
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400, "coverImage is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage){
        throw new ApiError(400, "error while uploading coverImage")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse (200, user, "coverImage updated sucessfully"))
})



export {registerUser, 
        loginUser, 
        logoutUser, 
        refreshAccessToken, 
        changeCurrentPassword, 
        getCurrentUser,
        updateUserDetails,
        updateCoverImage,
        updateAvatar 
    }