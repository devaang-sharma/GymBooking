import { AppError } from '../utils/AppError.js';

export function errorHandler(err, req, res, next ){
    if (err instanceof AppError){
        res.status(err.status).json({"error": {"code": err.code, "message": err.message, "details": err.details}})

    }
    else if (err.type === 'entity.parse.failed') {
        res.status(400).json({ error: { code: 'INVALID_JSON', message: 'not valid JSON' } });
    }   
    else{
        console.error(err)
        res.status(500).json({"error": {"code": "INTERNAL_ERROR", "message": "Something went wrong"}})
    }
}

export function notFound(req, res) {
    res.status(404).json({"error": {"code": "NOT_FOUND", "message": "Not found" }})
}