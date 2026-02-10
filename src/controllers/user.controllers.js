import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import {asyncHandler} from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const generateAccessAndRefreshToken = async(userId) => {
    try {
        const user = await User.findById(userId)

        const accessToken = generateAccessToken()
        const refreshToken = generateRefreshToken()

        user.refreshToken = refreshToken

        user.save({ validBeforeSave: false })

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

    // req bocdy se data lenge
    // username and email hai ya nhi
    // find the user
    // password check
    // access and refresh tocken generated
    // send cookies


   const {email, userName, password} = req.body
   
   if(!userName || !email) {
    throw new ApiError(400, "username or email is required")
   }

   const user = await User.findOne({
    $or: [{userName}, {email}]
   })

   if(!user) {
    throw new ApiError(400, "user doesn't exists")
   }

   const passwordValid = await user.isPasswordCorrect(password)

   if(!passwordValid) {
    throw new ApiError(401, "passwprd invalid")
   }

   const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id)

   const loggedInUser = await User.findById(user_id)
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


export {registerUser, loginUser, logoutUser}