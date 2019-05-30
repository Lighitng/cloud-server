var Model = require('../models')
const router = require('express').Router()
const { ExpressAsyncCatch } = require('../utils')
const { validate, checkAccount } = require('./middlewares')
const Joi = require('@hapi/joi')
/**
 * @api {put} /account/transfer 转账
 * @apiParam {String} account_id 汇款人id
 * @apiParam {String} recipient_id 收款人id
 * @apiParam {String} amount 转账金额
 * @apiGroup Account
 * @apiUse Account
 * @apiSuccessExample 
 * @apiErrorExample account_not_found
 * {
 *    errcode: 3,   //errcode 为非零值
 *    errmsg: '收款账号不存在'
 * }
 * @apiErrorExample insufficient_funds
 * {
 *    errcode: 2,   // errcode 为非零值
 *    errmsg: '余额不足'
 * }
 */
router.put('/account/transfer',
  validate('body', Joi.object().keys({
    account_id: Joi.string().required(),
    recipient_id: Joi.string().required(),
    amount: Joi.number().required().min(0)
  })),
  checkAccount('body'),
  ExpressAsyncCatch(async (req, res, next) => {
    const { account_id, recipient_id, amount } = req.body
    const remitter = await Model.Account.findOne({
      account_id
    })
    const recipient = await Model.Account.findOne({
      account_id: recipient_id
    })
    if (!recipient) {
      res.send({
        errcode: 3,
        errmsg: '收款账号不存在'
      })
    } else if (remitter.balance < amount) {
      res.send({
        errcode: 2,
        errmsg: '余额不足'
      })
    } else {
      await Model.Account.update(
        { account_id },
        { balance: remitter.balance - amount }
      )
      await Model.Account.update(
        { account_id: recipient_id },
        { $set: { balance: recipient.balance + amount } }
      )
      await Model.Record.create({
        remitter_id: account_id,
        recipient_id: recipient_id,
        amount: amount,
        operation_type: 'Transfer',
        record_time: new Date()
      })
      const remitter_new = await Model.Account.findOne({
        account_id: account_id
      })
      res.send(remitter_new)
    }
  })
)

module.exports = router
