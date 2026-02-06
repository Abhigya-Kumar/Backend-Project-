const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise
        .resolve(requestHandler(req, res, next))
        .catch((err) => next(err))
    }
}

export {asyncHandler}


//const asyncHandler = (fn) => () => {}
// lia hua function ko leke aage dede isliye aasie likhe hai
// (fn) ko aage bhej diye
//const asyncHandler = (fn) => async () => {}

// const asyncHandler = (fn) => async (res, req, next) => {
//     try {
//         await fn (req, res, next)
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message
//         })
//     }
// } 